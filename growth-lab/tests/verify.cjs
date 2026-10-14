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
  '--gl-white': '#FFFFFF', '--gl-panel': '#F5F5F5', '--gl-ink': '#111111', '--gl-black': '#111111' };
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

// The white sections after the stages. Copy and facts must match DESIGN_SYSTEM.md and SOURCES.md
const EXPECTED_COPY = {
  evidenceH2: '1,634 martech stacks benchmarked.',
  evidenceLede: 'Growth Lab works with MartechTribe, drawing on martech research across industries since 2017.',
  quiet: 'MartechTribe indexes 1,345 features across 49 martech categories and has advised 200+ global brands.',
  caption: 'MartechMap 2026 · chiefmartec and MartechTribe · 15,505 products',
  workshopsH2: 'Two workshops with MartechTribe.',
  auditH2: 'Start with an audit.',
  auditLede: 'We examine your martech, data and customer journeys to find where value is being lost.',
  note: 'Email us to agree the scope and next steps.',
};
const WORKSHOPS = [
  ['Value Engineering Workshop', 'Turn marketing initiatives into boardroom business cases using your own data.', 'Three mornings'],
  ['Technology Strategy Workshop', 'Benchmark your stack against high performing peers and leave with technology priorities and an investment roadmap.', 'Three mornings or one full day'],
];
const PEOPLE = [['Neil Botha', 'Founder and Strategy Director, Growth Lab'], ['Frans Riemersma', 'Founder, MartechTribe']];
const RETAIL_URL = 'https://martechtribe.com/blog/there-is-no-best-in-class-technology-its-official';
const AUDIT_MAILTO = 'mailto:hello@growthlab.co.za?subject=Audit%20enquiry';

const results = [];
function lum(rgb) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
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
    for (const k of ['--gl-purple', '--gl-coral', '--gl-amber', '--gl-white', '--gl-panel', '--gl-ink', '--gl-black']) {
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
    const colour = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
    const grounds = { hero: colour('.hero', 'backgroundColor'), stages: colour('.approach', 'backgroundColor'),
      node: colour('.node', 'backgroundColor'), h2: colour('.stage h2', 'color'), tag: colour('.stage .tag', 'color'),
      body: colour('.stage .body', 'color'), num: colour('.stage .num', 'color'), arrow: getComputedStyle(document.querySelector('.stage'), '::before').backgroundColor };
    return {
      grounds, tokens, faces, families: [...families], offenders, monoInCss: /mono|martian/i.test(sheetText.replace(/\/\*[\s\S]*?\*\//g, '')),
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
  const g = info.grounds;
  check(`${tag} hero background is white`, g.hero === 'rgb(255, 255, 255)', g.hero);
  check(`${tag} four stage section is black #111111`, g.stages === 'rgb(17, 17, 17)', g.stages);
  const ratios = { heading: contrast(g.h2, g.stages), tagline: contrast(g.tag, g.stages), body: contrast(g.body, g.stages),
    number: contrast(g.num, g.stages), tile: contrast(g.node, g.stages), arrow: contrast(g.arrow, g.stages) };
  check(`${tag} text on black meets AA`, ratios.heading >= 4.5 && ratios.tagline >= 7 && ratios.body >= 7 && ratios.number >= 4.5,
    Object.entries(ratios).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', '));
  check(`${tag} purple tiles and arrows read on black`, ratios.tile >= 3 && ratios.arrow >= 3 && g.h2 === 'rgb(255, 78, 78)' && g.tag === 'rgb(255, 255, 255)',
    `tile ${ratios.tile.toFixed(2)}, arrow ${ratios.arrow.toFixed(2)}, heading ${g.h2}, tagline ${g.tag}`);
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
  check(`${tag} email links: footer contact and the audit enquiry`, info.mailto.length === 2 && info.mailto.includes('mailto:hello@growthlab.co.za') &&
    info.mailto.includes(AUDIT_MAILTO), info.mailto.join(', '));
  check(`${tag} stage numbers in Geist, not uppercase mono`, info.numbering.length === 4 &&
    info.numbering.every((n) => /^"?Geist/.test(n.font) && n.transform === 'none'), info.numbering.map((n) => n.text).join(' '));
  if (vp.width > 760) {
    check(`${tag} top stage links in Geist sentence case`, info.nav.length === 4 && info.nav.every((n) =>
      /^"?Geist/.test(n.font) && n.transform === 'none' && n.visible), info.nav.map((n) => `${n.text} ${n.spacing}`).join(', '));
  }
  return info;
}

// Lazy images load only near the viewport: bring each one in and wait, then return to the top
async function loadImages(page) {
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img')) {
      img.scrollIntoView({ block: 'center', behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 120));
      if (!img.complete) {
        await new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 4000); });
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

async function extensionChecks(page, vp) {
  const tag = `[${vp.name}]`;
  const x = await page.evaluate(() => {
    const t = (sel, root = document) => { const el = root.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
    const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
    const order = ['.approach', '#evidence', '#workshops', '#audit', '.rune-stage'].map((sel) => document.querySelector(sel));
    const map = document.querySelector('#evidence .map img');
    const figure = document.querySelector('#evidence .map');
    const copy = document.querySelector('.evidence-copy');
    const cs = (el) => getComputedStyle(el);
    const visible = (el) => el.getBoundingClientRect().width > 0;
    const small = [];
    for (const el of document.querySelectorAll('a[href], button, summary')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || el.classList.contains('skip')) continue;
      if (r.width < 24 || r.height < 24) small.push(`${(el.getAttribute('aria-label') || el.textContent).trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const retail = document.querySelector('.workshop a[href*="martechtribe.com/blog"]');
    const newText = ['#evidence', '#workshops', '#audit'].map((sel) => document.querySelector(sel).innerText).join('\n');
    return {
      inOrder: order.every((el, i) => i === 0 || (order[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
      grounds: ['#evidence', '#workshops', '#audit'].map((sel) => cs(document.querySelector(sel)).backgroundColor),
      copy: { evidenceH2: t('#evidence h2'), evidenceLede: t('#evidence .lede'), quiet: t('#evidence .quiet'),
        caption: t('#evidence figcaption span'), workshopsH2: t('#workshops h2'), auditH2: t('#audit h2'),
        auditLede: t('#audit .lede'), note: t('#audit .cta-note') },
      source: { text: t('#evidence .source'), href: document.querySelector('#evidence .source a').getAttribute('href') },
      mapLink: { text: t('#evidence figcaption a'), href: document.querySelector('#evidence figcaption a').getAttribute('href') },
      figureText: figure.textContent + ' ' + map.alt,
      map: { complete: map.complete, nw: map.naturalWidth, nh: map.naturalHeight, fit: cs(map).objectFit, box: box(map) },
      copyBox: box(copy), gapCopyMap: box(figure).t - box(copy).b,
      workshops: [...document.querySelectorAll('.workshop')].map((w) => ({
        name: t('h3', w), outcome: t('.outcome', w), duration: t('.duration', w), box: box(w),
        card: [cs(w).backgroundColor, cs(w).boxShadow, cs(w).borderTopLeftRadius].join(' '),
        borderLeft: `${cs(w).borderLeftWidth} ${cs(w).borderLeftStyle}`, borderTop: `${cs(w).borderTopWidth} ${cs(w).borderTopStyle}`,
        media: w.querySelectorAll('img, svg, picture, canvas, video').length,
        open: w.querySelector('details').open, summary: t('summary', w) })),
      people: [...document.querySelectorAll('.person')].map((p) => {
        const img = p.querySelector('img'); const r = img.getBoundingClientRect();
        return { name: t('h3', p), role: t('.role', p), bio: t('.bio', p), ok: img.complete && img.naturalWidth > 0,
          nw: img.naturalWidth, w: r.width, h: r.height, imgBox: box(img), nameBox: box(p.querySelector('h3')),
          style: [cs(img).borderTopLeftRadius, cs(img).filter, cs(img).boxShadow, cs(img).objectFit].join(' | ') };
      }),
      introBox: box(document.querySelector('.start-intro')), peopleBox: box(document.querySelector('.people')),
      actionBox: box(document.querySelector('.start-action')),
      cta: (() => { const a = document.querySelector('#audit .start-action .btn'); return { text: a.textContent.trim(), href: a.getAttribute('href'), dark: a.classList.contains('btn-dark') }; })(),
      header: (() => { const a = document.querySelector('.site-header .btn'); return { text: a.textContent.trim(), href: a.getAttribute('href'), visible: visible(a) }; })(),
      dark: [...document.querySelectorAll('.btn-dark')].filter(visible).map((b) => b.textContent.trim()),
      footTalk: [...document.querySelectorAll('.foot-contact .btn')].map((b) => `${b.textContent.trim()}:${b.className}:${cs(b).backgroundColor}`),
      retail: retail && { href: retail.getAttribute('href'), target: retail.target, rel: retail.rel,
        text: retail.childNodes[0].textContent.trim(), label: t('.example-label', retail.closest('.workshop')), shown: retail.checkVisibility() },
      banned: newText.match(/richest|world.?s|largest|leading|best in class|unrivalled|\bfees?\b|\bfree\b|\bpric|\bR\s?\d/gi) || [],
      booking: document.body.innerText.match(/booked|booking confirmed|appointment|confirmed/gi) || [],
      oldHeading: /Martech audits in numbers/i.test(document.body.innerText),
      small, primaries: [...document.querySelectorAll('.btn-dark')].filter(visible).map((b) => b.getBoundingClientRect().height),
      anims: document.getAnimations().map((a) => a.animationName || a.transitionProperty || 'unknown'),
      sectionPad: parseFloat(cs(document.querySelector('#evidence .plain-body')).paddingTop),
    };
  });

  check(`${tag} new sections sit between the black stages and the rune`, x.inOrder);
  check(`${tag} evidence, workshops and audit sections are white`, x.grounds.every((c) => c === 'rgb(255, 255, 255)'), x.grounds.join(', '));
  const wrong = Object.entries(EXPECTED_COPY).filter(([k, v]) => x.copy[k] !== v).map(([k]) => `${k}: ${x.copy[k]}`);
  check(`${tag} new copy is exactly as approved`, wrong.length === 0, wrong.join(' | '));
  check(`${tag} source link and as of date shown`, x.source.href === 'https://martechtribe.com/' && /as at 14 October 2026\.$/.test(x.source.text), x.source.text);
  check(`${tag} map caption keeps 15,505 products apart from the 49 categories`, !/\b49\b/.test(x.figureText) && /15,505 products/.test(x.copy.caption));
  check(`${tag} map loads whole at its true 16:9`, x.map.complete && x.map.nw > 0 && Math.abs(x.map.nw / x.map.nh - 16 / 9) < 0.01 &&
    Math.abs(x.map.box.w / x.map.box.h - 16 / 9) < 0.01 && x.map.fit !== 'cover', `${Math.round(x.map.box.w)}x${Math.round(x.map.box.h)}, natural ratio ${(x.map.nw / x.map.nh).toFixed(3)}`);
  check(`${tag} View the full map opens the large image`, /^View the full map/.test(x.mapLink.text) && /martechmap-2026-full\.jpg$/.test(x.mapLink.href), x.mapLink.href);
  if (vp.width >= 1000) {
    const share = x.copyBox.w / (x.copyBox.w + x.map.box.w);
    check(`${tag} evidence split about 40 / 60, copy left and map right`, x.copyBox.r <= x.map.box.l && share > 0.36 && share < 0.44 && x.map.box.h <= 420,
      `copy ${Math.round(x.copyBox.w)}px (${Math.round(share * 100)}%), map ${Math.round(x.map.box.w)}x${Math.round(x.map.box.h)}`);
    check(`${tag} portraits sit beside the audit action`, x.peopleBox.l >= x.introBox.r && x.actionBox.t > x.introBox.b);
  } else {
    check(`${tag} copy first, map second, no large gap`, x.copyBox.b <= x.map.box.t && x.gapCopyMap <= 64 && x.sectionPad <= 72,
      `gap ${Math.round(x.gapCopyMap)}px, section padding ${x.sectionPad}px`);
    check(`${tag} audit order: heading, people, then the button`, x.introBox.b <= x.peopleBox.t && x.peopleBox.b <= x.actionBox.t);
  }
  const ws = x.workshops;
  check(`${tag} two workshops with exact names, lines and durations`, ws.length === 2 &&
    ws.every((w, i) => w.name === WORKSHOPS[i][0] && w.outcome === WORKSHOPS[i][1] && w.duration === WORKSHOPS[i][2]),
    ws.map((w) => `${w.name} / ${w.duration}`).join(' | '));
  check(`${tag} workshops are open columns, not cards, with no images`, ws.every((w) => w.card === 'rgba(0, 0, 0, 0) none 0px' && w.media === 0),
    ws.map((w) => w.card).join(' | '));
  if (vp.width > 760) {
    check(`${tag} workshops side by side, equal, one hairline between`, ws[1].box.l >= ws[0].box.r - 1 &&
      Math.abs(ws[0].box.w - ws[1].box.w) < 2 && ws[1].borderLeft === '1px solid' && ws[0].borderLeft === '0px none', ws.map((w) => Math.round(w.box.w)).join(' and '));
  } else {
    check(`${tag} workshops stack with one hairline between`, ws[1].box.t >= ws[0].box.b && ws[1].borderTop === '1px solid' && ws[1].borderLeft === '0px none');
  }
  check(`${tag} workshop details closed by default`, ws.every((w) => !w.open && w.summary === 'What you leave with'));
  check(`${tag} retail example is a labelled link, not an image`, !!x.retail && x.retail.href === RETAIL_URL && x.retail.target === '_blank' &&
    /noopener/.test(x.retail.rel) && x.retail.text === 'See the retail benchmark example' && /^Retail industry example/.test(x.retail.label) && !x.retail.shown,
    JSON.stringify(x.retail));
  const ppl = x.people;
  check(`${tag} two genuine portraits with identical 96px treatment`, ppl.length === 2 && ppl.every((p) => p.ok && p.nw >= 192 &&
    Math.round(p.w) === 96 && Math.round(p.h) === 96) && ppl[0].style === ppl[1].style, ppl.map((p) => `${p.name} ${Math.round(p.w)}x${Math.round(p.h)} ${p.style}`).join(' || '));
  check(`${tag} names and separate roles`, ppl.every((p, i) => p.name === PEOPLE[i][0] && p.role === PEOPLE[i][1]));
  check(`${tag} bios make no joint delivery claim`, ppl.every((p) => p.bio && !/audit|jointly|together|attend|every /i.test(p.bio)), ppl.map((p) => p.bio).join(' | '));
  check(`${tag} one action: Book an audit in the header and the audit section`, x.cta.text === 'Book an audit' && x.cta.href === AUDIT_MAILTO && x.cta.dark &&
    x.header.text === 'Book an audit' && x.header.href === '#audit' && x.header.visible && x.dark.length === 2 && x.dark.every((d) => d === 'Book an audit'),
    JSON.stringify({ cta: x.cta, header: x.header, dark: x.dark }));
  check(`${tag} footer Talk to us is a quiet secondary action`, x.footTalk.some((f) => /^Talk to us:.*btn-quiet.*:rgb\(255, 255, 255\)$/.test(f)), x.footTalk.join(' | '));
  check(`${tag} no pricing, superlatives, booking claims or audit count heading`, x.banned.length === 0 && x.booking.length === 0 && !x.oldHeading,
    [...x.banned, ...x.booking].join(', '));
  check(`${tag} click targets at least 24px and buttons 44px tall`, x.small.length === 0 && x.primaries.every((h) => h >= 44), x.small.join(' | ') || x.primaries.join(', '));
  check(`${tag} no new animation: only the rune moves after the cube`, x.anims.length === 2 && x.anims.every((n) => /^rune-[ab]$/.test(n)), x.anims.join(', '));
}

// Keyboard only: Tab onto the second summary, open it with Enter, reach the link inside, close with Space
async function detailsKeyboard(page, vp) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.focus('#evidence figcaption a');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => ({ tag: document.activeElement.tagName, ring: getComputedStyle(document.activeElement).outlineStyle }));
  await page.keyboard.press('Enter');
  const opened = await page.evaluate(() => { const d = document.querySelectorAll('.workshop details')[1];
    return { open: d.open, shown: d.querySelector('a').checkVisibility() }; });
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => document.activeElement.childNodes[0] && document.activeElement.childNodes[0].textContent.trim());
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Space');
  const closed = await page.evaluate(() => !document.querySelectorAll('.workshop details')[1].open);
  check(`[${vp.name}] workshop details work from the keyboard`, focused.tag === 'SUMMARY' && focused.ring !== 'none' && opened.open && opened.shown &&
    inside === 'See the retail benchmark example' && closed, JSON.stringify({ focused, opened, inside, closed }));
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
    await loadImages(page);
    await extensionChecks(page, vp);
    await detailsKeyboard(page, vp);
    // Rune breathing: it runs by default while on screen and drifts far enough to see at this width
    await page.locator('.rune-stage').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const drift = await page.evaluate(() => {
      const a = document.querySelector('.rune-a'), anim = a.getAnimations()[0];
      if (!anim) return null;
      const dur = anim.effect.getTiming().duration, was = anim.currentTime, state = anim.playState;
      anim.pause(); anim.currentTime = 0;
      const r0 = a.getBoundingClientRect();
      anim.currentTime = dur - 1;
      const r1 = a.getBoundingClientRect();
      anim.currentTime = was; anim.play();
      return { state, dur, dx: +(r0.left - r1.left).toFixed(1), dy: +(r0.top - r1.top).toFixed(1),
        idle: document.querySelector('.rune-stage').classList.contains('rune-idle') };
    });
    check(`[${vp.name}] rune breathes on screen and drifts visibly`, !!drift && drift.state === 'running' && !drift.idle &&
      drift.dx >= 10 && drift.dy >= 10, JSON.stringify(drift));
    check(`[${vp.name}] no script errors`, errors.length === 0, errors.join(' | '));
    await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-full.png`), fullPage: true });
    const clip = await page.evaluate(() => { const a = document.getElementById('evidence').getBoundingClientRect(), b = document.getElementById('audit').getBoundingClientRect();
      return { x: 0, y: a.top + scrollY, width: document.documentElement.clientWidth, height: b.bottom - a.top }; });
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-new-sections.png`), fullPage: true, clip });
    // The header action lands on the audit section
    await page.click('.site-header .btn-dark');
    await page.waitForTimeout(1400);
    const auditTop = await page.evaluate(() => document.getElementById('audit').getBoundingClientRect().top);
    check(`[${vp.name}] header Book an audit lands on the audit section`, Math.abs(auditTop) < 4, `${Math.round(auditTop)}px from the top`);

    if (vp.name === 'desktop') {
      await page.locator('.device-card').screenshot({ path: path.join(SHOTS, 'cube-rest.png') });
      await page.evaluate(() => document.querySelectorAll('.workshop details').forEach((d) => { d.open = true; }));
      await page.locator('#workshops').screenshot({ path: path.join(SHOTS, 'workshops-details-open.png') });
      await page.evaluate(() => document.querySelectorAll('.workshop details').forEach((d) => { d.open = false; }));
      // Rune motion: measure the transform while it is on screen
      await page.locator('.rune-stage').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const t0 = await page.evaluate(() => getComputedStyle(document.querySelector('.rune-a')).transform);
      await page.waitForTimeout(3000);
      const t1 = await page.evaluate(() => getComputedStyle(document.querySelector('.rune-a')).transform);
      check('[desktop] rune moves slowly while on screen', t0 !== t1, `${t0} -> ${t1}`);
      // Freeze the cycle at rest and at its widest point to show the full range of movement
      const cycle = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.rune-a')).animationDuration) * 1000);
      for (const [name, ms] of [['rune-rest', 0], ['rune-peak', cycle - 1]]) {
        await page.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), ms);
        await page.locator('.rune-stage').screenshot({ path: path.join(SHOTS, `${name}.png`) });
      }
      await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SHOTS, 'rune-footer.png') });

      // Keyboard focus: from a fresh load, so the tour starts at the top, tab through every stop and check its ring
      await page.goto(base, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const stops = [];
      for (let i = 0; i < 24; i++) {
        await page.keyboard.press('Tab');
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) return null;
          const cs = getComputedStyle(el);
          return { label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 28),
            n: [...document.querySelectorAll('a[href], button, summary')].indexOf(el),
            ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
        });
        if (stop && !stops.some((s) => s.label === stop.label && s.n === stop.n)) stops.push(stop);
        if (stop && stop.label === 'Unlock' && !fs.existsSync(path.join(SHOTS, 'focus-header.png'))) {
          await page.screenshot({ path: path.join(SHOTS, 'focus-header.png'), clip: { x: 0, y: 0, width: 1440, height: 110 } });
        }
      }
      const mustReach = ['Book an audit', 'View the full map', 'What you leave with', 'Talk to us', 'Copy', 'Website terms'];
      check('[desktop] keyboard reaches every action with a visible ring', stops.every((s) => s.ring) &&
        mustReach.every((m) => stops.some((s) => s.label.startsWith(m))), stops.map((s) => s.label + (s.ring ? '' : ' (no ring)')).join(' > '));
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

  // The narrowest phones: nothing may push the page sideways, and the profiles stack
  const sctx = await browser.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 2 });
  const sp = await sctx.newPage();
  await sp.goto(base);
  await sp.waitForTimeout(800);
  await loadImages(sp);
  const narrow = await sp.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const outside = [...document.querySelectorAll('body *')].filter((el) => {
      if (el.closest('.rune-stage, .sr-only, .skip')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5);
    }).map((el) => `${el.tagName}.${el.className}`).slice(0, 6);
    const person = document.querySelector('.person');
    return { overflow: document.documentElement.scrollWidth - vw, outside,
      stacked: person.querySelector('img').getBoundingClientRect().bottom <= person.querySelector('h3').getBoundingClientRect().top };
  });
  check('[320px] no horizontal overflow and nothing outside the screen', narrow.overflow <= 0 && narrow.outside.length === 0,
    `overflow ${narrow.overflow}px ${narrow.outside.join(', ')}`);
  check('[320px] profiles stack portrait above text', narrow.stacked);
  const sclip = await sp.evaluate(() => { const a = document.getElementById('evidence').getBoundingClientRect(), b = document.getElementById('audit').getBoundingClientRect();
    return { x: 0, y: a.top + scrollY, width: 320, height: b.bottom - a.top }; });
  await sp.screenshot({ path: path.join(SHOTS, 'small-320-new-sections.png'), fullPage: true, clip: sclip });
  await sctx.close();

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
    // Images come from the files published beside the page
    await loadImages(pp);
    const pimg = await pp.evaluate(() => ({ imgs: [...document.querySelectorAll('img')].map((i) => ({ ok: i.complete && i.naturalWidth > 0, ratio: +(i.naturalWidth / i.naturalHeight).toFixed(3) })),
      full: document.querySelector('#evidence figcaption a').getAttribute('href') }));
    check('[preview] map and portraits load from the published files', pimg.imgs.length === 3 && pimg.imgs.every((i) => i.ok) &&
      Math.abs(pimg.imgs[0].ratio - 16 / 9) < 0.01 && fs.existsSync(path.join(previewDir, pimg.full)), JSON.stringify(pimg));
    // The artifact viewer can blank the page on an email link, so the preview has none: Book an audit
    // and Talk to us copy the address, which also stays on screen as selectable text
    await pctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const pvMail = await pp.evaluate(() => document.querySelectorAll('a[href^="mailto:"]').length);
    const auditBtn = pp.locator('#audit [data-copy]');
    await auditBtn.scrollIntoViewIfNeeded();
    await auditBtn.click();
    await pp.waitForTimeout(200);
    const talk = await pp.evaluate(() => { const a = document.getElementById('audit-email');
      return { label: document.querySelector('#audit [data-copy]').textContent, status: document.getElementById('copy-status').textContent,
        address: a.textContent, select: getComputedStyle(a).userSelect, note: document.querySelector('#audit .cta-note').textContent.replace(/\s+/g, ' ').trim(),
        page: !!document.querySelector('.hero'), booking: /booked|confirmed|appointment/i.test(document.body.innerText) }; });
    check('[preview] Book an audit copies the address, keeps the page and never confirms a booking', pvMail === 0 &&
      /^(Email copied|Selected)$/.test(talk.label) && /copied|selected/i.test(talk.status) && talk.address === 'hello@growthlab.co.za' &&
      talk.select === 'all' && /agree the scope and next steps\.$/.test(talk.note) && talk.page && !talk.booking, JSON.stringify(talk));
    await pp.waitForTimeout(2600);
    await pp.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('refused')); });
    await auditBtn.click();
    await pp.waitForTimeout(200);
    const fallback = await pp.evaluate(() => ({ label: document.querySelector('#audit [data-copy]').textContent, selected: String(window.getSelection()) }));
    check('[preview] if the clipboard is refused, the address is selected instead', fallback.label === 'Selected' &&
      fallback.selected === 'hello@growthlab.co.za', JSON.stringify(fallback));
    await pp.locator('.site-footer button.btn-quiet[data-copied]').click();
    await pp.waitForTimeout(200);
    const foot = await pp.evaluate(() => document.querySelector('.site-footer button.btn-quiet[data-copied]').textContent);
    check('[preview] quiet footer Talk to us also copies safely', /^(Email copied|Selected)$/.test(foot), foot);
    await pctx.close();
    fs.unlinkSync(path.join(previewDir, '_wrapped.html'));
    for (const n of ['privacy.html', 'terms.html']) {
      const html = fs.readFileSync(path.join(previewDir, n), 'utf8');
      check(`[preview] ${n} has no email links and returns to index.html`, !html.includes('mailto:') &&
        html.includes('href="index.html"') && !html.includes('href="./"'));
    }
  }

  // Browser files: complete pages that open straight from a folder, with no server
  const browserDir = path.join(ROOT, 'dist', 'browser');
  const mainFile = path.join(browserDir, 'growth-lab-martech.html');
  if (fs.existsSync(mainFile)) {
    const bctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const bp = await bctx.newPage();
    const berr = [], requests = [];
    bp.on('pageerror', (e) => berr.push(String(e)));
    bp.on('request', (r) => { if (!/^(file|data):/.test(r.url())) requests.push(r.url()); });
    await bp.goto('file://' + mainFile);
    await bp.waitForTimeout(3600);
    const bv = await bp.evaluate(async () => { await document.fonts.ready; return {
      geist: document.fonts.check('600 16px Geist'), cube: !document.getElementById('device').className.includes('pre-build'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mailto: document.querySelectorAll('a[href^="mailto:"]').length,
      files: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^(#|mailto:|https:)/.test(h)),
      external: [...document.querySelectorAll('a[href^="http"]')].map((a) => a.getAttribute('href')) }; });
    const bimg = await bp.evaluate(async () => {
      for (const i of document.querySelectorAll('img')) { i.scrollIntoView(); await i.decode().catch(() => {}); }
      return { imgs: [...document.querySelectorAll('img')].map((i) => ({ ok: i.complete && i.naturalWidth > 0, data: i.src.startsWith('data:image/jpeg'),
        ratio: +(i.naturalWidth / i.naturalHeight).toFixed(3) })), audit: document.querySelector('#audit .btn-dark').getAttribute('href') }; });
    check('[browser file] images are built in, load at true ratios, audit email has its subject', bimg.imgs.length === 3 &&
      bimg.imgs.every((i) => i.ok && i.data) && Math.abs(bimg.imgs[0].ratio - 16 / 9) < 0.01 && bimg.audit === AUDIT_MAILTO, JSON.stringify(bimg));
    const missing = bv.files.filter((h) => !fs.existsSync(path.join(browserDir, h)));
    check('[browser file] opens from a folder: Geist, cube, no requests, links resolve, email works',
      bv.geist && bv.cube && bv.overflow <= 0 && requests.length === 0 && missing.length === 0 && bv.mailto > 0 && berr.length === 0 &&
      bv.external.length === 2 && bv.external.every((h) => h === 'https://martechtribe.com/' || h === RETAIL_URL),
      JSON.stringify({ ...bv, missing, requests, errors: berr }));
    await bctx.close();
    for (const n of ['growth-lab-privacy-draft.html', 'growth-lab-terms-draft.html']) {
      const html = fs.readFileSync(path.join(browserDir, n), 'utf8');
      check(`[browser file] ${n} returns to the main page`, html.includes('href="growth-lab-martech.html"') && !html.includes('href="./"'));
    }
  }

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${path.relative(process.cwd(), SHOTS)}`);
  process.exit(failed.length ? 1 : 0);
})();
