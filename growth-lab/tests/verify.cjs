/* Growth Lab website checks. Serves site/ locally, drives Chromium with Playwright and writes
   screenshots to dist/screenshots. Exits non zero if any check fails.

   Run from growth-lab/:
     python3 scripts/build.py preview
     node tests/verify.cjs
   Needs Playwright (npm i -D playwright, or a global install found through NODE_PATH). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const SHOTS = path.join(ROOT, 'dist', 'screenshots');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };
const EXPECTED_TOKENS = { '--gl-purple': '#7761FF', '--gl-coral': '#FF4E4E', '--gl-amber': '#FEBC2E',
  '--gl-white': '#FFFFFF', '--gl-panel': '#F5F5F5', '--gl-ink': '#111111' };
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : detail });
}

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(SITE, url.endsWith('/') ? url + 'index.html' : url);
      if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const logoPaths = [...fs.readFileSync(path.join(SITE, 'assets/brand/growthlab-logo.svg'), 'utf8')
  .matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
const staticHtml = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const finalTop = /class="f-top" points="([^"]+)"/.exec(staticHtml)[1];

async function pageChecks(page, vp) {
  const tag = `[${vp.name}]`;
  const info = await page.evaluate(async () => {
    await document.fonts.ready;
    const rootStyle = getComputedStyle(document.documentElement);
    const tokens = {};
    for (const k of ['--gl-purple', '--gl-coral', '--gl-amber', '--gl-white', '--gl-panel', '--gl-ink']) {
      tokens[k] = rootStyle.getPropertyValue(k).trim().toUpperCase();
    }
    const faces = [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'Geist').map((f) => f.status);
    const families = new Set();
    const offenders = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent.trim() || !n.parentElement) continue;
      const el = n.parentElement;
      if (el.closest('script, style')) continue;
      const fam = getComputedStyle(el).fontFamily;
      families.add(fam);
      if (!/^"?Geist"?,/.test(fam) || /mono/i.test(fam)) offenders.push(el.tagName + ':' + fam);
    }
    const sheetText = [...document.styleSheets].map((s) => {
      try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch (e) { return ''; }
    }).join('\n');
    const logos = [...document.querySelectorAll('svg.logo')].map((svg) => ({
      viewBox: svg.getAttribute('viewBox'),
      paths: [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d')),
      box: (() => { const r = svg.getBoundingClientRect(); return { w: r.width, h: r.height }; })(),
      fill: getComputedStyle(svg).fill,
    }));
    const rune = document.querySelector('.rune');
    const runeBox = rune.getBoundingClientRect();
    const stageBox = document.querySelector('.rune-stage').getBoundingClientRect();
    const anchors = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'));
    const missing = anchors.filter((h) => h.length > 1 && !document.getElementById(h.slice(1)));
    const deadHash = anchors.filter((h) => h === '#');
    const mailto = [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href'));
    const numbering = [...document.querySelectorAll('.stage .num')].map((n) => ({
      text: n.textContent, font: getComputedStyle(n).fontFamily, transform: getComputedStyle(n).textTransform }));
    const nav = [...document.querySelectorAll('.nav-links a')].map((a) => ({
      text: a.textContent, font: getComputedStyle(a).fontFamily, transform: getComputedStyle(a).textTransform,
      spacing: getComputedStyle(a).letterSpacing, visible: a.getBoundingClientRect().width > 0 }));
    return {
      tokens, faces, families: [...families], offenders, monoInCss: /mono|martian/i.test(sheetText.replace(/\/\*[\s\S]*?\*\//g, '')),
      geistLoaded: document.fonts.check('600 16px Geist') && document.fonts.check('400 16px Geist'),
      logos, rune: { paths: [...rune.querySelectorAll('path')].map((p) => p.getAttribute('d')), w: runeBox.width,
        h: runeBox.height, cropped: runeBox.bottom > stageBox.bottom + 1, stageH: stageBox.height },
      missing, deadHash, mailto, numbering, nav,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  check(`${tag} no horizontal overflow`, info.overflow <= 0, `overflow ${info.overflow}px`);
  check(`${tag} Geist loaded from self hosted woff2`, info.geistLoaded && info.faces.includes('loaded'), JSON.stringify(info.faces));
  check(`${tag} every text node renders in Geist`, info.offenders.length === 0, info.offenders.slice(0, 5).join(' | ') || info.families.join(' | '));
  check(`${tag} no monospace or Martian in stylesheets`, !info.monoInCss);
  for (const [k, v] of Object.entries(EXPECTED_TOKENS)) {
    check(`${tag} token ${k}`, info.tokens[k] === v, `${info.tokens[k]} expected ${v}`);
  }
  check(`${tag} header and footer logos use the verified SVG`, info.logos.length === 2 && info.logos.every((l) =>
    l.viewBox === '0 0 297 70' && JSON.stringify(l.paths) === JSON.stringify(logoPaths) && l.box.w > 90 && l.box.h > 20),
  info.logos.map((l) => `${Math.round(l.box.w)}x${Math.round(l.box.h)} ${l.fill}`).join(', '));
  check(`${tag} rune is paths 1 and 2 of the logo`, JSON.stringify(info.rune.paths) === JSON.stringify(logoPaths.slice(0, 2)));
  check(`${tag} rune keeps its proportions`, Math.abs(info.rune.w / info.rune.h - 32.333 / 36.756) < 0.01,
    `${Math.round(info.rune.w)}x${Math.round(info.rune.h)}`);
  check(`${tag} rune is cropped by the divider`, info.rune.cropped, `stage ${Math.round(info.rune.stageH)}px`);
  check(`${tag} anchors resolve`, info.missing.length === 0 && info.deadHash.length === 0, info.missing.join(','));
  check(`${tag} contact uses hello@growthlab.co.za`, info.mailto.length > 0 && info.mailto.every((m) => m === 'mailto:hello@growthlab.co.za'));
  check(`${tag} stage numbers in Geist, not uppercase mono`, info.numbering.length === 4 &&
    info.numbering.every((n) => /^"?Geist/.test(n.font) && n.transform === 'none'), info.numbering.map((n) => n.text).join(' '));
  if (vp.width > 760) {
    check(`${tag} top stage links in Geist sentence case`, info.nav.length === 4 && info.nav.every((n) =>
      /^"?Geist/.test(n.font) && n.transform === 'none' && n.visible), info.nav.map((n) => `${n.text} ${n.spacing}`).join(', '));
  }
  return info;
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.name === 'desktop' ? 1 : 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base, { waitUntil: 'load' });
    if (vp.name === 'desktop') {
      await page.waitForTimeout(700);
      const midTop = await page.getAttribute('.f-top', 'points');
      const building = await page.evaluate(() => document.getElementById('device').classList.contains('building'));
      check('[desktop] cube animation runs on load', building && midTop !== finalTop, 'mid frame differs from the resting cube');
      await page.locator('.device-card').screenshot({ path: path.join(SHOTS, 'cube-mid-build.png') });
    }
    await page.waitForTimeout(3400);
    const endTop = await page.getAttribute('.f-top', 'points');
    check(`[${vp.name}] cube settles on the full cube`, endTop === finalTop);
    await pageChecks(page, vp);
    check(`[${vp.name}] no script errors`, errors.length === 0, errors.join(' | '));
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-full.png`), fullPage: true });

    if (vp.name === 'desktop') {
      await page.locator('.device-card').screenshot({ path: path.join(SHOTS, 'cube-rest.png') });
      // Rune motion: measure the transform while it is on screen
      await page.locator('.rune-stage').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const t0 = await page.evaluate(() => getComputedStyle(document.querySelector('.rune-a')).transform);
      await page.waitForTimeout(3000);
      const t1 = await page.evaluate(() => getComputedStyle(document.querySelector('.rune-a')).transform);
      check('[desktop] rune moves slowly while on screen', t0 !== t1, `${t0} -> ${t1}`);
      // Freeze the cycle at rest and at its widest point to show the full range of movement
      for (const [name, ms] of [['rune-rest', 0], ['rune-peak', 14000]]) {
        await page.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), ms);
        await page.locator('.rune-stage').screenshot({ path: path.join(SHOTS, `${name}.png`) });
      }
      await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SHOTS, 'rune-footer.png') });

      // Keyboard focus: tab through the page and check every stop shows a ring
      await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.activeElement && document.activeElement.blur(); });
      const stops = [];
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Tab');
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) return null;
          const cs = getComputedStyle(el);
          return { label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 28),
            ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
        });
        if (stop) stops.push(stop);
        if (stop && stop.label === 'Unlock' && !fs.existsSync(path.join(SHOTS, 'focus-header.png'))) {
          await page.screenshot({ path: path.join(SHOTS, 'focus-header.png'), clip: { x: 0, y: 0, width: 1440, height: 110 } });
        }
      }
      check('[desktop] keyboard focus is visible at every stop', stops.every((s) => s.ring), stops.map((s) => s.label + (s.ring ? '' : ' (no ring)')).join(' > '));
      await page.focus('[data-copy]');
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.screenshot({ path: path.join(SHOTS, 'focus-footer.png'), clip: { x: 0, y: 900 - 230, width: 1440, height: 230 } });
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.click('[data-copy]');
      await page.waitForTimeout(200);
      const status = (await page.textContent('#copy-status')) + ' | ' + (await page.textContent('[data-copy]'));
      check('[desktop] copy button confirms', /copied|selected/i.test(status), status);

      // Links to the draft legal pages resolve and are labelled as drafts
      for (const p of ['privacy.html', 'terms.html']) {
        const res = await page.request.get(base + p);
        const body = await res.text();
        check(`[links] ${p} returns 200 and is marked draft`, res.status() === 200 && body.includes('Draft for review') && body.includes('noindex'));
      }
      const legal = await ctx.newPage();
      await legal.goto(base + 'privacy.html');
      await legal.evaluate(() => document.fonts.ready);
      await legal.screenshot({ path: path.join(SHOTS, 'privacy-draft.png'), fullPage: true });
    }
    await ctx.close();
  }

  // Reduced motion: the finished cube at once, a still rune, nothing grey
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  await rp.goto(base);
  await rp.waitForTimeout(150);
  const rTop = await rp.getAttribute('.f-top', 'points');
  const rBuilding = await rp.evaluate(() => document.getElementById('device').className);
  check('[reduced motion] cube shows its final state at once', rTop === finalTop && !/building|pre-build/.test(rBuilding), rBuilding);
  await rp.locator('.rune-stage').scrollIntoViewIfNeeded();
  await rp.waitForTimeout(1500);
  const rRune = await rp.evaluate(() => ({ a: getComputedStyle(document.querySelector('.rune-a')).animationName,
    t: getComputedStyle(document.querySelector('.rune-a')).transform }));
  check('[reduced motion] rune stays still', rRune.a === 'none' && rRune.t === 'none', JSON.stringify(rRune));
  await rp.screenshot({ path: path.join(SHOTS, 'reduced-motion.png') });
  await rctx.close();

  // Private preview build: one self contained page, wrapped the way the artifact host wraps it
  const previewDir = path.join(ROOT, 'dist', 'preview');
  if (fs.existsSync(path.join(previewDir, 'index.html'))) {
    const wrapped = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,sans-serif;background:#fff;color:#000}</style></head><body>' +
      fs.readFileSync(path.join(previewDir, 'index.html'), 'utf8') + '</body></html>';
    fs.writeFileSync(path.join(previewDir, '_wrapped.html'), wrapped);
    const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const pp = await pctx.newPage();
    const perr = [];
    pp.on('pageerror', (e) => perr.push(String(e)));
    await pp.goto('file://' + path.join(previewDir, '_wrapped.html'));
    await pp.waitForTimeout(3600);
    const pv = await pp.evaluate(async () => { await document.fonts.ready; return {
      geist: document.fonts.check('600 16px Geist'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      external: [...document.querySelectorAll('link[href], script[src]')].map((e) => e.getAttribute('href') || e.getAttribute('src')) }; });
    check('[preview] self contained, Geist loads, no overflow', pv.geist && pv.overflow <= 0 && pv.external.length === 0 && perr.length === 0, JSON.stringify(pv));
    await pctx.close();
    fs.unlinkSync(path.join(previewDir, '_wrapped.html'));
  }

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${path.relative(process.cwd(), SHOTS)}`);
  process.exit(failed.length ? 1 : 0);
})();
