/* Growth Lab website checks. Serves site/ locally with the real contact function behind
   /api/contact (its calls to Google and Resend answered by mocks, so nothing leaves this machine),
   drives Chromium with Playwright, unit tests the function, checks the preview and browser builds,
   and writes screenshots to dist/screenshots. Exits non zero if any check fails.

   Run from growth-lab/:
     python3 scripts/build.py package
     node tests/verify.cjs
   Needs Playwright (npm i -D playwright, or a global install found through NODE_PATH). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const SHOTS = path.join(ROOT, 'dist', 'screenshots');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const { pathToFileURL } = require('url');
let contactApi = null; // api/contact.mjs is an ES module, imported when the run starts

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain', '.jpg': 'image/jpeg' };
const EXPECTED_TOKENS = { '--gl-purple': '#7761FF', '--gl-coral': '#FF4E4E', '--gl-amber': '#FEBC2E',
  '--gl-white': '#FFFFFF', '--gl-panel': '#F5F5F5', '--gl-ink': '#111111', '--gl-black': '#111111',
  '--gl-error': '#C42B2B', '--gl-field-line': '#8A8A8A' };
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];
const RECIPIENT = 'hello@growthlab.co.za';
const PHONE = { display: '+27 84 504 0505', href: 'tel:+27845040505' }; // confirmed by Neil, 14 October 2026

// Approved copy. It must match DESIGN_SYSTEM.md and SOURCES.md
const HOME = {
  evidenceH2: 'Put independent research to work.',
  evidenceLede: 'Growth Lab works with MartechTribe, drawing on martech research across industries since 2017.',
  benefits: ['See where your stack underperforms.', 'Prioritise the investments that matter.', 'Build a clearer case for change.'],
  proof: 'MartechTribe has benchmarked 1,634 martech stacks.',
  workshopsH2: 'Start creating value.',
  attribution: 'Two workshops with MartechTribe.',
  startH2: 'Let’s get going today.',
  startLede: 'We examine your martech, data and customer journeys to find where value is being lost.',
};
const WORKSHOPS = [
  { name: 'Value Engineering Workshop', icon: '#i-value', colour: 'rgb(119, 97, 255)',
    outcome: 'Turn marketing initiatives into boardroom business cases using your own data.', duration: 'Three mornings',
    values: ['A quantified view of business value', 'An executive ready business case', 'Ranked investment priorities', 'A framework your team can reuse'] },
  { name: 'Technology Strategy Workshop', icon: '#i-route', colour: 'rgb(255, 78, 78)',
    outcome: 'Benchmark your stack against high performing peers and leave with technology priorities and an investment roadmap.',
    duration: 'Three mornings or one full day',
    values: ['A benchmark against high performing peers', 'Prioritised technology investments', 'An investment roadmap', 'Executive recommendations'] },
];
const PEOPLE = [['Neil Botha', 'Founder and Strategy Director, Growth Lab'], ['Frans Riemersma', 'Founder, MartechTribe']];
const CONTACT = {
  h1: 'Unlock value fast',
  lead: 'Make your martech, customer data and AI work harder for your business.',
  placeholder: 'Can you tell us more about your requirements?',
  fields: [
    { id: 'f-name', label: 'Full name', type: 'text', auto: 'name', required: true },
    { id: 'f-company', label: 'Company', type: 'text', auto: 'organization', required: true },
    { id: 'f-email', label: 'Work email', type: 'email', auto: 'email', required: true },
    { id: 'f-phone', label: 'Contact number (optional)', type: 'tel', auto: 'tel', required: false },
    { id: 'f-message', label: 'Message', type: 'textarea', auto: null, required: true },
  ],
};
const ENTRY = { name: 'Thandi Test Mokoena', company: 'Test Mutual', email: 'thandi.test@example.co.za', phone: '+27 21 555 0100',
  message: 'We want to see where our engagement platform underperforms. Testing 4471.' };
const PII = [ENTRY.name, ENTRY.company, ENTRY.email, ENTRY.phone, 'Testing 4471', 'test-token'];

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) }); }
function lum(rgb) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

// The contact function runs for real; only Google and Resend are mocked
const CONFIGURED = { RECAPTCHA_SITE_KEY: 'test-site-key', RECAPTCHA_SECRET_KEY: 'test-secret-value', RESEND_API_KEY: 'test-resend-value',
  CONTACT_FROM_EMAIL: 'Growth Lab website <website@example.test>' };
const api = { env: {}, behaviour: {}, posts: 0, verify: [], sent: [], logs: [] };
function jsonResponse(status, body) { return { ok: status >= 200 && status < 300, status, json: async () => body }; }
function mockFetch(behaviour, env) {
  return async (url, options) => {
    if (url === 'https://www.google.com/recaptcha/api/siteverify') {
      if (behaviour.captcha === 'down') throw new Error('network down');
      const params = new URLSearchParams(options.body);
      api.verify.push({ secretOk: params.get('secret') === env.RECAPTCHA_SECRET_KEY, token: params.get('response') });
      const ok = behaviour.captcha === 'ok' && params.get('response') === 'test-token';
      return jsonResponse(200, ok ? { success: true, hostname: behaviour.hostname || '127.0.0.1' } : { success: false, 'error-codes': ['invalid-input-response'] });
    }
    if (url === 'https://api.resend.com/emails') {
      if (behaviour.send === 'down') throw new Error('network down');
      api.sent.push({ payload: JSON.parse(options.body), authOk: options.headers.Authorization === `Bearer ${env.RESEND_API_KEY}` });
      return behaviour.send === 'ok' ? jsonResponse(200, { id: 'test-email' }) : jsonResponse(422, { message: 'rejected' });
    }
    throw new Error(`unexpected outbound request: ${url}`);
  };
}
function useApi(env, behaviour) { Object.assign(api, { env, behaviour, posts: 0, verify: [], sent: [], logs: [] }); }
function handlerFor(env, behaviour) {
  return contactApi.createContactHandler({ env, fetch: mockFetch(behaviour, env), now: () => new Date('2026-10-14T10:00:00Z'),
    log: (level, code, detail) => api.logs.push(`${level} ${code} ${detail || ''}`) });
}

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (url === '/api/contact') {
        if (req.method === 'POST') api.posts += 1;
        handlerFor(api.env, api.behaviour)(req, res);
        return;
      }
      const file = path.join(SITE, url.endsWith('/') ? url + 'index.html' : url);
      if (!file.startsWith(SITE) || file.startsWith(path.join(SITE, 'api')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// A stand in for Google's reCAPTCHA script: same render, getResponse and reset calls, no network
const RECAPTCHA_STUB = `(function () {
  var state = { token: '', opts: null, resets: 0, renders: 0 };
  window.__captcha = state;
  window.grecaptcha = {
    render: function (el, opts) {
      state.opts = { sitekey: opts.sitekey, size: opts.size }; state.renders++;
      var b = document.createElement('button'); b.type = 'button'; b.id = 'stub-captcha'; b.textContent = 'Test reCAPTCHA stand in';
      b.style.cssText = 'min-height:44px;padding:0 16px;border:1px solid #8A8A8A;border-radius:8px;background:#fff;font:inherit';
      b.addEventListener('click', function () { state.token = 'test-token'; if (opts.callback) { opts.callback('test-token'); } });
      el.appendChild(b); return 0;
    },
    getResponse: function () { return state.token; },
    reset: function () { state.token = ''; state.resets++; }
  };
  var m = /[?&]onload=([^&]+)/.exec((document.currentScript && document.currentScript.src) || '');
  if (m && typeof window[m[1]] === 'function') { window[m[1]](); }
})();`;
async function stubRecaptcha(page) {
  await page.route(/^https:\/\/www\.google\.com\/recaptcha\/api\.js/, (route) => route.fulfill({ contentType: 'text/javascript', body: RECAPTCHA_STUB }));
}

const logoPaths = [...fs.readFileSync(path.join(SITE, 'assets/brand/growthlab-logo.svg'), 'utf8')
  .matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
const staticHtml = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const finalTop = /class="f-top" points="([^"]+)"/.exec(staticHtml)[1];

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

// Fonts, mono free text, logo, rune, tokens, the black section, overflow and sizing: any page
async function pageChecks(page, tag, opts = {}) {
  const info = await page.evaluate(async () => {
    await document.fonts.ready;
    const rootStyle = getComputedStyle(document.documentElement);
    const tokens = {};
    for (const k of ['--gl-purple', '--gl-coral', '--gl-amber', '--gl-white', '--gl-panel', '--gl-ink', '--gl-black', '--gl-error', '--gl-field-line']) {
      tokens[k] = rootStyle.getPropertyValue(k).trim().toUpperCase();
    }
    const offenders = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent.trim() || !n.parentElement || n.parentElement.closest('script, style')) continue;
      const fam = getComputedStyle(n.parentElement).fontFamily;
      if (!/^"?Geist"?,/.test(fam) || /mono/i.test(fam)) offenders.push(n.parentElement.tagName + ':' + fam);
    }
    for (const el of document.querySelectorAll('input, textarea, button')) {
      const fam = getComputedStyle(el).fontFamily;
      if (!/^"?Geist"?,/.test(fam)) offenders.push(el.tagName + ':' + fam);
    }
    const sheetText = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    const logos = [...document.querySelectorAll('svg.logo')].map((svg) => {
      const r = svg.getBoundingClientRect(); const word = svg.querySelectorAll('path')[3].getBBox();
      return { viewBox: svg.getAttribute('viewBox'), paths: [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d')),
        w: r.width, h: r.height, wordmark: word.height * r.height / 70 };
    });
    const anchors = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'));
    const header = document.querySelector('.site-header .wrap');
    const wrapInner = (() => { const w = document.querySelector('main .wrap'); const cs = getComputedStyle(w);
      return w.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); })();
    return {
      tokens, offenders, monoInCss: /mono|martian/i.test(sheetText.replace(/\/\*[\s\S]*?\*\//g, '')),
      geistLoaded: document.fonts.check('600 16px Geist') && document.fonts.check('400 16px Geist'),
      logos, missing: anchors.filter((h) => h.length > 1 && !document.getElementById(h.slice(1))), deadHash: anchors.filter((h) => h === '#'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerH: header.getBoundingClientRect().height, vw: window.innerWidth, wrapInner,
      h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
      body: parseFloat(getComputedStyle(document.body).fontSize),
    };
  });
  check(`${tag} no horizontal overflow`, info.overflow <= 0, `overflow ${info.overflow}px`);
  check(`${tag} Geist loaded and every text node and control renders in Geist`, info.geistLoaded && info.offenders.length === 0, info.offenders.slice(0, 4).join(' | '));
  check(`${tag} no monospace or Martian in stylesheets`, !info.monoInCss);
  const wrongTokens = Object.entries(EXPECTED_TOKENS).filter(([k, v]) => info.tokens[k] !== v).map(([k]) => `${k}=${info.tokens[k]}`);
  check(`${tag} brand and form tokens`, wrongTokens.length === 0, wrongTokens.join(', '));
  check(`${tag} logos use the verified SVG at a legible size`, info.logos.length === 2 && info.logos.every((l) => l.viewBox === '0 0 297 70' &&
    JSON.stringify(l.paths) === JSON.stringify(logoPaths) && l.h >= 24 && l.h <= 32 && l.wordmark >= 9),
    info.logos.map((l) => `${Math.round(l.w)}x${Math.round(l.h)}, wordmark ${l.wordmark.toFixed(1)}px`).join(' and '));
  check(`${tag} anchors resolve`, info.missing.length === 0 && info.deadHash.length === 0, info.missing.join(','));
  const headerTarget = info.vw <= 560 ? 68 : 76;
  check(`${tag} header is ${headerTarget}px, the same on every page`, Math.round(info.headerH) === headerTarget, `${info.headerH}px`);
  if (opts.sizing) opts.sizing.push(`${tag} header ${Math.round(info.headerH)}px, logo ${Math.round(info.logos[0].w)}x${Math.round(info.logos[0].h)}, content ${Math.round(info.wrapInner)}px, h1 ${info.h1}px, body ${info.body}px`);
  return info;
}

async function homeChecks(page, vp) {
  const tag = `[home ${vp.name}]`;
  const x = await page.evaluate(() => {
    const t = (sel, root = document) => { const el = root.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
    const cs = (el) => getComputedStyle(el);
    const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
    const visible = (el) => el.checkVisibility();
    const order = ['.approach', '#evidence', '#workshops', '#start', '.rune-stage'].map((s) => document.querySelector(s));
    const colour = (sel, prop) => cs(document.querySelector(sel))[prop];
    const map = document.querySelector('#evidence .map img');
    const sources = document.querySelector('#evidence details.sources');
    const small = [];
    for (const el of document.querySelectorAll('a[href], button, summary')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || el.classList.contains('skip') || !visible(el)) continue;
      if (r.width < 24 || r.height < 24) small.push(`${(el.getAttribute('aria-label') || el.textContent).trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const cta = document.querySelector('#start .start-action a');
    return {
      inOrder: order.every((el, i) => i === 0 || (order[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
      grounds: { hero: colour('.hero', 'backgroundColor'), stages: colour('.approach', 'backgroundColor'),
        white: ['#evidence', '#workshops', '#start'].map((s) => colour(s, 'backgroundColor')),
        node: colour('.node', 'backgroundColor'), h2: colour('.stage h2', 'color'), tag: colour('.stage .tag', 'color'),
        body: colour('.stage .body', 'color'), arrow: getComputedStyle(document.querySelector('.stage'), '::before').backgroundColor },
      numbering: document.querySelectorAll('.stage .num').length + [...document.querySelectorAll('.stage *')].filter((e) => /^0[1-4]$/.test(e.textContent.trim())).length,
      header: { links: [...document.querySelectorAll('.site-header a')].map((a) => `${a.textContent.trim() || a.getAttribute('aria-label')}|${a.getAttribute('href')}|${a.className}`),
        navs: document.querySelectorAll('.site-header nav, .site-header ul').length },
      evidence: { h2: t('#evidence h2'), lede: t('#evidence .lede'), benefits: [...document.querySelectorAll('#evidence .benefits li')].map((l) => l.textContent.trim()),
        proof: t('#evidence .proof'), captions: document.querySelectorAll('#evidence figcaption').length,
        visibleText: document.querySelector('#evidence').innerText,
        sources: { open: sources.open, summary: t('summary', sources), text: sources.querySelector('p').textContent.replace(/\s+/g, ' ').trim(),
          href: sources.querySelector('a').getAttribute('href'), shown: visible(sources.querySelector('p')) },
        map: { ok: map.complete && map.naturalWidth > 0, ratio: map.naturalWidth / map.naturalHeight, boxRatio: map.getBoundingClientRect().width / map.getBoundingClientRect().height,
          fit: cs(map).objectFit, alt: map.alt, box: box(map) }, copyBox: box(document.querySelector('.evidence-copy')) },
      workshops: { h2: t('#workshops h2'), attribution: t('#workshops .attribution'),
        items: [...document.querySelectorAll('.workshop')].map((w) => {
          const icon = w.querySelector('h3 .w-icon'); const use = icon && icon.querySelector('use');
          const d = w.querySelector('details');
          const h3 = w.querySelector('h3');
          const iconOffset = icon ? icon.getBoundingClientRect().top - h3.getBoundingClientRect().top - (parseFloat(cs(h3).lineHeight) - 28) / 2 : 99;
          return { name: t('h3', w), outcome: t('.outcome', w), duration: t('.duration', w), box: box(w), iconOffset,
            lines: Math.round(h3.getBoundingClientRect().height / parseFloat(cs(h3).lineHeight)),
            icon: use ? use.getAttribute('href') : null, iconColour: icon ? cs(icon).color : null, iconSize: icon ? Math.round(icon.getBoundingClientRect().width) : 0,
            bullet: getComputedStyle(w.querySelector('.duration'), '::before').backgroundColor,
            card: [cs(w).backgroundColor, cs(w).boxShadow, cs(w).borderTopLeftRadius].join(' '),
            borderLeft: `${cs(w).borderLeftWidth} ${cs(w).borderLeftStyle}`, borderTop: `${cs(w).borderTopWidth} ${cs(w).borderTopStyle}`,
            open: d.open, summary: t('summary', d), values: [...d.querySelectorAll('li')].map((l) => l.textContent.trim()),
            valueBullet: getComputedStyle(d.querySelector('li'), '::before').backgroundColor, images: w.querySelectorAll('img, picture, video, canvas').length };
        }) },
      start: { h2: t('#start h2'), lede: t('#start .lede'), people: [...document.querySelectorAll('.person')].map((p) => {
          const img = p.querySelector('img'); const r = img.getBoundingClientRect();
          return { name: t('h3', p), role: t('.role', p), bio: t('.bio', p), ok: img.complete && img.naturalWidth > 0, w: r.width, h: r.height,
            style: [cs(img).borderTopLeftRadius, cs(img).filter, cs(img).boxShadow].join(' | ') };
        }),
        cta: { text: cta.textContent.trim(), href: cta.getAttribute('href'), cls: cta.className, bg: cs(cta).backgroundColor, fg: cs(cta).color,
          size: parseFloat(cs(cta).fontSize), weight: Number(cs(cta).fontWeight), h: cta.getBoundingClientRect().height },
        text: document.querySelector('#start').innerText, introBox: box(document.querySelector('.start-intro')),
        peopleBox: box(document.querySelector('.people')), actionBox: box(document.querySelector('.start-action')) },
      footer: { text: document.querySelector('.site-footer').innerText.replace(/\s+/g, ' ').trim(),
        links: [...document.querySelectorAll('.site-footer a')].map((a) => `${a.textContent.trim() || a.getAttribute('aria-label')}|${a.getAttribute('href')}`) },
      mailto: document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').length, copyButtons: document.querySelectorAll('[data-copy]').length,
      emailText: /@/.test(document.body.innerText),
      banned: (document.querySelector('main').innerText.match(/richest|world.?s|largest|leading|best in class|unrivalled|\bfees?\b|\bfree\b|\bpric|\bR\s?\d|1,500,505|booked|appointment|confirmed/gi) || []),
      retail: document.querySelectorAll('a[href*="martechtribe.com/blog"]').length + (/retail/i.test(document.body.textContent) ? 1 : 0),
      small, primaries: [...document.querySelectorAll('.btn-dark, .btn-coral')].filter(visible).map((b) => Math.round(b.getBoundingClientRect().height)),
      anims: document.getAnimations().map((a) => a.animationName || a.transitionProperty || 'unknown'),
    };
  });

  const g = x.grounds;
  check(`${tag} hero white, stages black, new sections white`, g.hero === 'rgb(255, 255, 255)' && g.stages === 'rgb(17, 17, 17)' &&
    g.white.every((c) => c === 'rgb(255, 255, 255)'), `${g.hero}, ${g.stages}, ${g.white.join(', ')}`);
  const ratios = { heading: contrast(g.h2, g.stages), tagline: contrast(g.tag, g.stages), body: contrast(g.body, g.stages),
    tile: contrast(g.node, g.stages), arrow: contrast(g.arrow, g.stages) };
  check(`${tag} black section: coral headings, white taglines, readable body, purple tiles`, ratios.heading >= 4.5 && ratios.tagline >= 7 &&
    ratios.body >= 7 && ratios.tile >= 3 && ratios.arrow >= 3 && g.h2 === 'rgb(255, 78, 78)' && g.tag === 'rgb(255, 255, 255)',
    Object.entries(ratios).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', '));
  check(`${tag} no 01 to 04 numbering`, x.numbering === 0);
  check(`${tag} sections in order between the stages and the rune`, x.inOrder);
  check(`${tag} header: real logo and one action, Book an audit to the contact view, no menu`, x.header.navs === 0 && x.header.links.length === 2 &&
    x.header.links[1] === 'Book an audit|contact.html|btn btn-dark', x.header.links.join(' ; '));

  const e = x.evidence;
  check(`${tag} evidence copy: heading, sentence, three benefits, one quiet proof point`, e.h2 === HOME.evidenceH2 && e.lede === HOME.evidenceLede &&
    JSON.stringify(e.benefits) === JSON.stringify(HOME.benefits) && e.proof === HOME.proof, JSON.stringify([e.h2, e.lede, e.benefits, e.proof]));
  check(`${tag} other figures sit in a closed sources note`, !e.sources.open && !e.sources.shown && e.sources.summary === 'Sources' &&
    /15,505 solutions/.test(e.sources.text) && /1,345 features daily across 49 martech categories/.test(e.sources.text) &&
    /200\+ global brands/.test(e.sources.text) && /as at 14 October 2026\.$/.test(e.sources.text) && e.sources.href === 'https://martechtribe.com/' &&
    !/1,345|15,505|200\+/.test(e.visibleText), e.sources.text);
  check(`${tag} map stays whole at 16:9 with no caption or full map link`, e.captions === 0 && !/View the full map/.test(e.visibleText) &&
    e.map.ok && Math.abs(e.map.ratio - 16 / 9) < 0.01 && Math.abs(e.map.boxRatio - 16 / 9) < 0.01 && e.map.fit !== 'cover' &&
    /chiefmartec and MartechTribe/.test(e.map.alt), `${Math.round(e.map.box.w)}x${Math.round(e.map.box.h)}`);
  if (vp.width >= 1000) {
    const share = e.copyBox.w / (e.copyBox.w + e.map.box.w);
    check(`${tag} evidence split about 40 / 60`, e.copyBox.r <= e.map.box.l && share > 0.36 && share < 0.44, `${Math.round(share * 100)}%`);
  } else {
    check(`${tag} evidence copy first, map second`, e.copyBox.b <= e.map.box.t && e.map.box.t - e.copyBox.b <= 64);
  }

  const w = x.workshops;
  check(`${tag} workshops: Start creating value, quiet MartechTribe attribution`, w.h2 === HOME.workshopsH2 && w.attribution === HOME.attribution);
  check(`${tag} workshop names, lines and durations`, w.items.length === 2 && w.items.every((it, i) => it.name === WORKSHOPS[i].name &&
    it.outcome === WORKSHOPS[i].outcome && it.duration === WORKSHOPS[i].duration), w.items.map((it) => `${it.name} / ${it.duration}`).join(' | '));
  check(`${tag} small coloured line icons match their duration and value bullets`, w.items.every((it, i) => it.icon === WORKSHOPS[i].icon &&
    it.iconColour === WORKSHOPS[i].colour && it.bullet === WORKSHOPS[i].colour && it.valueBullet === WORKSHOPS[i].colour && it.iconSize === 28),
    w.items.map((it) => `${it.icon} ${it.iconColour} ${it.iconSize}px, bullet ${it.bullet}`).join(' | '));
  check(`${tag} each icon sits on its heading's first line`, w.items.every((it) => Math.abs(it.iconOffset) <= 1.5),
    w.items.map((it) => `${it.lines} line(s), offset ${it.iconOffset.toFixed(1)}px`).join(' | '));
  check(`${tag} The value you get: closed by default with crisp bullets`, w.items.every((it, i) => !it.open && it.summary === 'The value you get' &&
    JSON.stringify(it.values) === JSON.stringify(WORKSHOPS[i].values)));
  check(`${tag} open columns, no cards, no images, no retail example`, w.items.every((it) => it.card === 'rgba(0, 0, 0, 0) none 0px' && it.images === 0) && x.retail === 0);
  if (vp.width > 760) {
    check(`${tag} workshops side by side with one hairline`, w.items[1].box.l >= w.items[0].box.r - 1 && Math.abs(w.items[0].box.w - w.items[1].box.w) < 2 &&
      w.items[1].borderLeft === '1px solid' && w.items[0].borderLeft === '0px none');
  } else {
    check(`${tag} workshops stack with one hairline`, w.items[1].box.t >= w.items[0].box.b && w.items[1].borderTop === '1px solid');
  }

  const s = x.start;
  check(`${tag} Let’s get going today with the approved Diagnose line`, s.h2 === HOME.startH2 && s.lede === HOME.startLede);
  check(`${tag} Neil and Frans: genuine portraits, identical 96px, separate roles`, s.people.length === 2 && s.people.every((p, i) => p.ok &&
    Math.round(p.w) === 96 && Math.round(p.h) === 96 && p.name === PEOPLE[i][0] && p.role === PEOPLE[i][1]) && s.people[0].style === s.people[1].style &&
    s.people.every((p) => !/audit|jointly|together|attend|every /i.test(p.bio)));
  check(`${tag} coral Let’s Talk opens the contact view`, s.cta.text === 'Let’s Talk' && s.cta.href === 'contact.html' && /btn-coral/.test(s.cta.cls) &&
    s.cta.bg === 'rgb(255, 78, 78)' && s.cta.fg === 'rgb(255, 255, 255)' && s.cta.h >= 44, `${s.cta.bg} on ${s.cta.fg}, ${s.cta.size}px ${s.cta.weight}`);
  check(`${tag} white on coral is large bold text (WCAG large text, 3:1)`, s.cta.size >= 18.66 && s.cta.weight >= 700 && contrast(s.cta.bg, s.cta.fg) >= 3,
    `${s.cta.size}px ${s.cta.weight}, ${contrast(s.cta.bg, s.cta.fg).toFixed(2)}:1`);
  check(`${tag} no email address, copy action or helper copy in the call to action`, !/@|Email us|Copies/.test(s.text) && x.copyButtons === 0);
  if (vp.width >= 1000) check(`${tag} portraits beside the action`, s.peopleBox.l >= s.introBox.r && s.actionBox.t > s.introBox.b);
  else check(`${tag} heading, then people, then the button`, s.introBox.b <= s.peopleBox.t && s.peopleBox.b <= s.actionBox.t);

  check(`${tag} footer: logo, copyright and legal links only`, x.footer.links.length === 3 && /© 2026 Growth Lab/.test(x.footer.text) &&
    /Privacy/.test(x.footer.text) && /Website terms/.test(x.footer.text) && /Drafts, pending approval/.test(x.footer.text) &&
    !/Diagnose|Talk to us|Copy|@/.test(x.footer.text), x.footer.links.join(' ; '));
  check(`${tag} no email or phone links on the homepage`, x.mailto === 0 && !x.emailText);
  check(`${tag} no pricing, superlatives or booking claims`, x.banned.length === 0, x.banned.join(', '));
  check(`${tag} click targets at least 24px, action buttons at least 44px`, x.small.length === 0 && x.primaries.every((h) => h >= 44), x.small.join(' | ') || x.primaries.join(', '));
  check(`${tag} no new animation: only the rune moves after the cube`, x.anims.length === 2 && x.anims.every((n) => /^rune-[ab]$/.test(n)), x.anims.join(', '));
}

// Keyboard only: open and close details with Enter and Space, reach the link inside the sources note
async function detailsKeyboard(page, tag) {
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.focus('.site-header .btn-dark');
  await page.keyboard.press('Tab');
  const sources = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), ring: getComputedStyle(document.activeElement).outlineStyle }));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const sourceLink = await page.evaluate(() => document.activeElement.getAttribute('href'));
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const second = await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent.trim(),
    ring: getComputedStyle(document.activeElement).outlineStyle }));
  await page.keyboard.press('Enter');
  const opened = await page.evaluate(() => { const d = document.querySelectorAll('.workshop details')[1]; return d.open && d.querySelector('li').checkVisibility(); });
  await page.keyboard.press('Space');
  const closed = await page.evaluate(() => [...document.querySelectorAll('details')].every((d) => !d.open));
  check(`${tag} details open and close from the keyboard`, sources.text === 'Sources' && sources.ring !== 'none' && sourceLink === 'https://martechtribe.com/' &&
    second.tag === 'SUMMARY' && second.text === 'The value you get' && second.ring !== 'none' && opened && closed, JSON.stringify({ sources, sourceLink, second, opened, closed }));
}

async function fillContact(page, entry) {
  await page.fill('#f-name', entry.name);
  await page.fill('#f-company', entry.company);
  await page.fill('#f-email', entry.email);
  await page.fill('#f-phone', entry.phone);
  await page.fill('#f-message', entry.message);
}

async function contactLayout(page, tag, width) {
  const x = await page.evaluate(() => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
    const panel = getComputedStyle(document.querySelector('.contact-panel')).backgroundColor;
    const inputs = [...document.querySelectorAll('.field input, .field textarea')].map((el) => ({ id: el.id, box: box(el) }));
    const targets = [...document.querySelectorAll('a[href], button, input:not([tabindex="-1"]), textarea')].filter((el) => el.checkVisibility() && !el.classList.contains('skip'))
      .map((el) => ({ id: el.id || el.textContent.trim().slice(0, 20), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width }));
    const details = [...document.querySelectorAll('.contact-details > div')].map(box);
    return { panel, intro: box(document.querySelector('.contact-intro')), panelBox: box(document.querySelector('.contact-panel')), inputs, details,
      submit: box(document.querySelector('.form-actions .btn-coral')), targets,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check(`${tag} no horizontal overflow`, x.overflow <= 0, `${x.overflow}px`);
  check(`${tag} form on a light grey quiet panel`, x.panel === 'rgb(245, 245, 245)', x.panel);
  const [name, company] = x.inputs;
  const [mail, phone] = x.details;
  const sameRow = Math.abs(phone.t - mail.t) < 1 && phone.l >= mail.r;
  if (width >= 760) check(`${tag} phone sits beside the email`, sameRow, `email ${Math.round(mail.l)} to ${Math.round(mail.r)}, phone from ${Math.round(phone.l)}`);
  else check(`${tag} email and phone side by side or stacked, both on screen`, (sameRow || phone.t >= mail.b) && phone.r <= width, `phone ${Math.round(phone.l)} to ${Math.round(phone.r)}`);
  if (width >= 1000) check(`${tag} heading left, form right`, x.intro.r <= x.panelBox.l);
  else check(`${tag} heading above the form`, x.intro.b <= x.panelBox.t);
  if (width > 640) check(`${tag} name and company side by side`, Math.abs(name.box.t - company.box.t) < 1 && company.box.l > name.box.r);
  else check(`${tag} fields stack in one column, full width button`, x.inputs.every((i) => Math.abs(i.box.l - name.box.l) < 1) && Math.abs(x.submit.w - name.box.w) < 2);
  const small = x.targets.filter((t) => t.h < 24 || t.w < 24);
  check(`${tag} real click targets: fields 48px, buttons 52px, links 24px`, small.length === 0 && x.inputs.every((i) => i.box.h >= 44) && x.submit.h >= 44,
    small.map((t) => `${t.id} ${Math.round(t.w)}x${Math.round(t.h)}`).join(' | ') || `submit ${Math.round(x.submit.h)}px`);
}

/* The contact function itself, called directly with mocked Google and Resend responses */
async function callApi({ env = CONFIGURED, behaviour = { captcha: 'ok', send: 'ok' }, method = 'POST', headers = { 'content-type': 'application/json' },
  body, raw, parsed, throwingBody }) {
  Object.assign(api, { verify: [], sent: [], logs: [] });
  const text = raw !== undefined ? raw : (body !== undefined ? JSON.stringify(body) : '');
  const req = Readable.from(text ? [Buffer.from(text)] : []);
  req.method = method;
  req.headers = { ...headers, 'content-length': String(Buffer.byteLength(text)) };
  if (parsed !== undefined) req.body = parsed;
  if (throwingBody) Object.defineProperty(req, 'body', { get() { throw new Error('Invalid JSON'); } });
  const res = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } };
  await handlerFor(env, behaviour)(req, res);
  let json = null;
  try { json = JSON.parse(res.body); } catch (e) { /* empty for HEAD */ }
  return { status: res.statusCode, json, raw: res.body, headers: res.headers, logs: api.logs.slice(), verify: api.verify.slice(), sent: api.sent.slice() };
}

async function apiChecks() {
  const good = { ...ENTRY, token: 'test-token', website: '' };
  const allLogs = [];
  const run = async (o) => { const r = await callApi(o); allLogs.push(...r.logs); return r; };

  let r = await run({ env: {}, method: 'GET' });
  check('[api] GET without configuration: not ready, no key', r.status === 200 && r.json.ready === false && r.json.siteKey === null && r.headers['cache-control'] === 'no-store');
  r = await run({ method: 'GET' });
  check('[api] GET configured: ready with the public site key only', r.status === 200 && r.json.ready === true && r.json.siteKey === 'test-site-key' &&
    !/test-secret-value|test-resend-value/.test(r.raw) && Object.keys(r.json).length === 2, r.raw);
  r = await run({ env: { ...CONFIGURED, RESEND_API_KEY: '' }, body: good });
  check('[api] fails closed without every variable: 503, nothing sent', r.status === 503 && r.json.code === 'not_configured' && r.verify.length === 0 &&
    r.sent.length === 0 && /missing RESEND_API_KEY/.test(r.logs.join()), r.logs.join());
  r = await run({ method: 'PUT', body: good });
  check('[api] other methods refused with 405', r.status === 405 && r.headers.allow === 'GET, POST');
  r = await run({ headers: { 'content-type': 'text/plain' }, body: good });
  check('[api] only JSON accepted', r.status === 415 && r.sent.length === 0);
  r = await run({ raw: '{"name":' });
  check('[api] malformed JSON refused', r.status === 400 && r.json.code === 'bad_json');
  r = await run({ throwingBody: true, raw: '' });
  check('[api] platform body parse failure refused', r.status === 400 && r.json.code === 'bad_json');
  r = await run({ raw: JSON.stringify({ ...good, message: 'x'.repeat(40000) }) });
  check('[api] oversized body refused with 413', r.status === 413 && r.sent.length === 0);
  r = await run({ body: { ...good, website: 'http://spam.example' } });
  check('[api] honeypot submissions refused, nothing verified or sent', r.status === 400 && r.json.code === 'rejected' && r.verify.length === 0 && r.sent.length === 0);
  r = await run({ body: { token: 'test-token' } });
  check('[api] required fields validated on the server', r.status === 400 && r.json.code === 'invalid' &&
    JSON.stringify(Object.keys(r.json.errors).sort()) === JSON.stringify(['company', 'email', 'message', 'name']) &&
    r.json.errors.email === 'Enter your work email address.' && r.verify.length === 0, JSON.stringify(r.json.errors));
  r = await run({ body: { ...good, name: 'Line one\nLine two', email: 'not-an-email', phone: 'call me', message: 'y'.repeat(5001) } });
  check('[api] bad values rejected with readable messages', r.status === 400 && r.json.errors.name && r.json.errors.email === 'Enter a valid email address, like name@company.co.za.' &&
    r.json.errors.phone === 'Enter a valid contact number, or leave it blank.' && r.json.errors.message === 'Keep your message under 5,000 characters.', JSON.stringify(r.json.errors));
  r = await run({ body: { ...good, token: '' } });
  check('[api] missing reCAPTCHA token refused before any call', r.status === 400 && r.json.code === 'captcha_missing' && r.verify.length === 0);
  r = await run({ behaviour: { captcha: 'fail', send: 'ok' }, body: good });
  check('[api] failed reCAPTCHA: 403, nothing sent', r.status === 403 && r.json.code === 'captcha_failed' && r.verify.length === 1 && r.verify[0].secretOk && r.sent.length === 0);
  r = await run({ behaviour: { captcha: 'down', send: 'ok' }, body: good });
  check('[api] reCAPTCHA unreachable: fails closed with 503', r.status === 503 && r.json.code === 'captcha_unavailable' && r.sent.length === 0);
  r = await run({ env: { ...CONFIGURED, CONTACT_ALLOWED_HOSTNAMES: 'growthlab.co.za, www.growthlab.co.za' }, behaviour: { captcha: 'ok', send: 'ok', hostname: 'evil.example' }, body: good });
  check('[api] token from another hostname refused', r.status === 403 && r.sent.length === 0);
  r = await run({ env: { ...CONFIGURED, CONTACT_ALLOWED_HOSTNAMES: 'growthlab.co.za, www.growthlab.co.za' }, behaviour: { captcha: 'ok', send: 'ok', hostname: 'www.growthlab.co.za' }, body: good });
  check('[api] token from an allowed hostname accepted', r.status === 200 && r.sent.length === 1);
  r = await run({ behaviour: { captcha: 'ok', send: 'fail' }, body: good });
  check('[api] provider rejection: 502 and never reported as sent', r.status === 502 && r.json.code === 'send_failed' && r.json.ok === false && /provider status 422/.test(r.logs.join()));
  r = await run({ behaviour: { captcha: 'ok', send: 'down' }, body: good });
  check('[api] provider unreachable: 502', r.status === 502 && r.json.code === 'send_failed');
  r = await run({ body: { ...good, to: 'attacker@example.com', cc: 'x@example.com', bcc: 'y@example.com', from: 'spoof@example.com', subject: 'Injected' } });
  const mail = r.sent[0] && r.sent[0].payload;
  check('[api] success: one email to hello@growthlab.co.za only, whatever the request says', r.status === 200 && r.json.ok === true && r.sent.length === 1 &&
    JSON.stringify(mail.to) === JSON.stringify([RECIPIENT]) && !('cc' in mail) && !('bcc' in mail) && mail.from === CONFIGURED.CONTACT_FROM_EMAIL &&
    mail.reply_to === ENTRY.email && r.sent[0].authOk, JSON.stringify({ to: mail && mail.to, from: mail && mail.from, reply_to: mail && mail.reply_to }));
  check('[api] the email carries every field and a single line subject', mail.subject === `Website enquiry: ${ENTRY.name}, ${ENTRY.company}` &&
    [ENTRY.name, ENTRY.company, ENTRY.email, ENTRY.phone, ENTRY.message].every((v) => mail.text.includes(v)) && !/Injected/.test(mail.subject + mail.text), mail.subject);
  check('[api] the success response carries no secrets', !/test-secret-value|test-resend-value|test-site-key/.test(r.raw), r.raw);
  r = await run({ body: { ...good, phone: '' } });
  check('[api] contact number optional', r.status === 200 && r.sent[0].payload.text.includes('Contact number: Not given'));
  r = await run({ parsed: { ...good }, raw: '' });
  check('[api] works with a body already parsed by Vercel', r.status === 200 && r.sent.length === 1);
  check('[api] logs never contain the visitor’s details or the token', allLogs.length > 5 && !allLogs.some((l) => PII.some((p) => l.includes(p))),
    `${allLogs.length} log lines, e.g. ${allLogs.slice(0, 3).join(' / ')}`);
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const sizing = [];
  contactApi = await import(pathToFileURL(path.join(SITE, 'api', 'contact.mjs')).href);

  await apiChecks();

  // The homepage at desktop, laptop, tablet and phone widths
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.name === 'mobile' ? 2 : 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base, { waitUntil: 'load' });
    if (vp.name === 'desktop') {
      await page.waitForTimeout(700);
      const midTop = await page.getAttribute('.f-top', 'points');
      const building = await page.evaluate(() => document.getElementById('device').classList.contains('building'));
      check('[home desktop] cube animation runs on load', building && midTop !== finalTop, 'mid frame differs from the resting cube');
      await page.locator('.device-card').screenshot({ path: path.join(SHOTS, 'cube-mid-build.png') });
    }
    await page.waitForTimeout(3400);
    check(`[home ${vp.name}] cube settles on the full cube`, (await page.getAttribute('.f-top', 'points')) === finalTop);
    await pageChecks(page, `[home ${vp.name}]`, { sizing });
    await loadImages(page);
    await homeChecks(page, vp);
    await detailsKeyboard(page, `[home ${vp.name}]`);

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
      return { state, dx: +(r0.left - r1.left).toFixed(1), dy: +(r0.top - r1.top).toFixed(1), idle: document.querySelector('.rune-stage').classList.contains('rune-idle') };
    });
    check(`[home ${vp.name}] rune breathes on screen and drifts visibly`, !!drift && drift.state === 'running' && !drift.idle && drift.dx >= 10 && drift.dy >= 10, JSON.stringify(drift));
    check(`[home ${vp.name}] no script errors`, errors.length === 0, errors.join(' | '));
    await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-full.png`), fullPage: true });
    const clip = await page.evaluate(() => { const a = document.getElementById('evidence').getBoundingClientRect(), b = document.getElementById('start').getBoundingClientRect();
      return { x: 0, y: a.top + scrollY, width: document.documentElement.clientWidth, height: b.bottom - a.top }; });
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-new-sections.png`), fullPage: true, clip });

    if (vp.name === 'desktop') {
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await page.locator('#workshops').screenshot({ path: path.join(SHOTS, 'workshops-details-open.png') });
      await page.locator('#evidence').screenshot({ path: path.join(SHOTS, 'evidence-sources-open.png') });
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = false; }));
      await page.locator('.device-card').screenshot({ path: path.join(SHOTS, 'cube-rest.png') });
      // Rune motion and its range
      await page.locator('.rune-stage').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const t0 = await page.evaluate(() => getComputedStyle(document.querySelector('.rune-a')).transform);
      await page.waitForTimeout(3000);
      const t1 = await page.evaluate(() => getComputedStyle(document.querySelector('.rune-a')).transform);
      check('[home desktop] rune moves slowly while on screen', t0 !== t1, `${t0} -> ${t1}`);
      const cycle = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.rune-a')).animationDuration) * 1000);
      for (const [name, ms] of [['rune-rest', 0], ['rune-peak', cycle - 1]]) {
        await page.evaluate((tm) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = tm; }), ms);
        await page.locator('.rune-stage').screenshot({ path: path.join(SHOTS, `${name}.png`) });
      }
      await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));

      // Keyboard tour from a fresh load: every stop, in reading order, with a visible ring
      await page.goto(base, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const stops = [];
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Tab');
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) return null;
          const cs = getComputedStyle(el);
          return { label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 28),
            n: [...document.querySelectorAll('a[href], button, summary')].indexOf(el), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
        });
        if (stop && !stops.some((s) => s.n === stop.n)) stops.push(stop);
        if (stop && stop.label === 'Book an audit' && !fs.existsSync(path.join(SHOTS, 'focus-header.png'))) {
          await page.screenshot({ path: path.join(SHOTS, 'focus-header.png'), clip: { x: 0, y: 0, width: 1440, height: 110 } });
        }
      }
      const expected = ['Skip to content', 'Growth Lab', 'Book an audit', 'Sources', 'The value you get', 'The value you get', 'Let’s Talk',
        'Growth Lab, back to top', 'Privacy', 'Website terms'];
      check('[home desktop] keyboard order follows the page and every stop shows a ring', stops.every((s) => s.ring) &&
        JSON.stringify(stops.map((s) => s.label)) === JSON.stringify(expected), stops.map((s) => s.label + (s.ring ? '' : ' (no ring)')).join(' > '));

      // Both actions open the contact view
      await page.click('.site-header .btn-dark');
      await page.waitForURL(/contact\.html$/);
      check('[home desktop] Book an audit opens the contact view', (await page.textContent('h1')).trim() === CONTACT.h1);
      await page.goBack();
      await page.click('#start .btn-coral');
      await page.waitForURL(/contact\.html$/);
      check('[home desktop] Let’s Talk opens the contact view', (await page.textContent('h1')).trim() === CONTACT.h1);

      // Draft legal pages
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

  // The contact view: layout at every width, with sending connected through the mocks
  useApi(CONFIGURED, { captcha: 'ok', send: 'ok' });
  for (const vp of [...VIEWPORTS, { name: '320px', width: 320, height: 640 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.width < 500 ? 2 : 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await stubRecaptcha(page);
    await page.goto(base + 'contact.html', { waitUntil: 'load' });
    await page.waitForSelector('#stub-captcha');
    const tag = `[contact ${vp.name}]`;
    await pageChecks(page, tag, { sizing });
    await contactLayout(page, tag, vp.width);
    const size = await page.evaluate(() => window.__captcha.opts.size);
    check(`${tag} reCAPTCHA renders ${vp.width < 400 ? 'compact or normal to fit' : 'normal'} with the site key from the server`,
      (await page.evaluate(() => window.__captcha.opts.sitekey)) === 'test-site-key' && (vp.width >= 400 ? size === 'normal' : ['normal', 'compact'].includes(size)) &&
      (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, size);
    if (vp.width === 320) check(`${tag} reCAPTCHA uses its compact size on the narrowest phones`, size === 'compact', size);
    check(`${tag} no script errors`, errors.length === 0, errors.join(' | '));
    await page.screenshot({ path: path.join(SHOTS, `contact-${vp.name}.png`), fullPage: true });
    await ctx.close();
  }

  // The contact view: labels, keyboard, validation, success and every failure path
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await stubRecaptcha(page);
    const loadContact = async (env, behaviour) => {
      useApi(env, behaviour);
      await page.goto(base + 'contact.html', { waitUntil: 'load' });
      if (env.RECAPTCHA_SITE_KEY) await page.waitForSelector('#stub-captcha');
      else await page.waitForSelector('#form-notice:not([hidden])');
    };
    const state = () => page.evaluate(() => ({
      status: document.getElementById('form-status').textContent, captcha: document.getElementById('recaptcha-error').textContent,
      invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.id),
      errors: [...document.querySelectorAll('.field-error:not([hidden])')].map((e) => e.textContent),
      focus: document.activeElement.id, success: document.querySelector('.form-success') ? document.querySelector('.form-success').innerText.replace(/\s+/g, ' ').trim() : null,
      resets: window.__captcha ? window.__captcha.resets : 0 }));

    await loadContact(CONFIGURED, { captcha: 'ok', send: 'ok' });
    const fields = await page.evaluate(() => [...document.querySelectorAll('.field input, .field textarea')].map((el) => ({
      id: el.id, label: document.querySelector(`label[for="${el.id}"]`) ? document.querySelector(`label[for="${el.id}"]`).textContent.replace(/\s+/g, ' ').trim() : null,
      type: el.tagName === 'TEXTAREA' ? 'textarea' : el.type, auto: el.getAttribute('autocomplete'), required: el.required, placeholder: el.getAttribute('placeholder') })));
    check('[contact] five labelled fields with types, autocomplete and required flags', JSON.stringify(fields.map((f) => [f.id, f.label, f.type, f.auto, f.required])) ===
      JSON.stringify(CONTACT.fields.map((f) => [f.id, f.label, f.type, f.auto, f.required])) && fields[4].placeholder === CONTACT.placeholder, JSON.stringify(fields));
    const intro = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent.trim(), lead: document.querySelector('.contact .lead').textContent.trim(),
      details: [...document.querySelectorAll('.contact-details > div')].map((d) => `${d.querySelector('dt').textContent.trim()}|${d.querySelector('a').textContent.trim()}|${d.querySelector('a').getAttribute('href')}`),
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')),
      submit: document.querySelector('.form-actions button').textContent.trim(), services: document.querySelectorAll('select, input[type="radio"], input[type="checkbox"]').length,
      captchaWrap: !!document.getElementById('recaptcha').querySelector('#stub-captcha') }));
    check('[contact] heading, support line, then email and Neil’s phone as working links', intro.h1 === CONTACT.h1 && intro.lead === CONTACT.lead &&
      JSON.stringify(intro.details) === JSON.stringify([`Email|${RECIPIENT}|mailto:${RECIPIENT}`, `Phone|${PHONE.display}|${PHONE.href}`]) &&
      intro.submit === 'Let’s Talk', JSON.stringify(intro));
    check('[contact] the confirmed number is the only phone link', JSON.stringify(intro.tel) === JSON.stringify([PHONE.href]), intro.tel.join(', '));
    check('[contact] no service choices or budget questions, and the real reCAPTCHA slot is used', intro.services === 0 && intro.captchaWrap);

    // Keyboard: from the top, through the email link and every field to the check and the button
    await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
    const order = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => {
        const el = document.activeElement; const cs = getComputedStyle(el);
        return { id: el.id || el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 24), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      }));
    }
    const ids = order.map((o) => o.id);
    check('[contact] keyboard reaches the email, the phone, every field, the check and the button with a visible ring', JSON.stringify(ids) ===
      JSON.stringify(['Skip to content', 'Growth Lab, home', RECIPIENT, PHONE.display, 'f-name', 'f-company', 'f-email', 'f-phone', 'f-message', 'stub-captcha', 'Let’s Talk', 'Growth Lab, home']) &&
      order.every((o) => o.ring) && !ids.includes('f-website'), ids.join(' > '));

    // Empty submit: readable errors on the required fields, focus on the first
    await page.click('.form-actions .btn-coral');
    let st = await state();
    check('[contact] empty submit shows readable errors and focuses the first field', JSON.stringify(st.invalid) === JSON.stringify(['f-name', 'f-company', 'f-email', 'f-message']) &&
      st.errors.join(' | ') === 'Error: Enter your full name. | Error: Enter your company name. | Error: Enter your work email address. | Error: Tell us a little about your requirements.' &&
      st.focus === 'f-name' && st.status === 'Please correct the highlighted fields.' && api.posts === 0, JSON.stringify(st));
    const errColour = await page.evaluate(() => ({ text: getComputedStyle(document.querySelector('.field-error')).color,
      border: getComputedStyle(document.getElementById('f-name')).borderColor, panel: getComputedStyle(document.querySelector('.contact-panel')).backgroundColor,
      field: getComputedStyle(document.getElementById('f-company')).borderColor }));
    check('[contact] error text and field borders meet contrast on the panel', contrast(errColour.text, errColour.panel) >= 4.5 &&
      contrast(errColour.field, errColour.panel) >= 3 && contrast(errColour.field, 'rgb(255, 255, 255)') >= 3,
      `error ${contrast(errColour.text, errColour.panel).toFixed(2)}, field border ${contrast(errColour.field, errColour.panel).toFixed(2)}`);
    await page.screenshot({ path: path.join(SHOTS, 'contact-errors.png'), fullPage: true });

    // Invalid email and number, then valid fields without the check
    await fillContact(page, { ...ENTRY, email: 'not-an-email', phone: 'call me' });
    await page.click('.form-actions .btn-coral');
    st = await state();
    check('[contact] invalid email and number explained', JSON.stringify(st.invalid) === JSON.stringify(['f-email', 'f-phone']) &&
      st.errors.join(' | ') === 'Error: Enter a valid email address, like name@company.co.za. | Error: Enter a valid contact number, or leave it blank.', st.errors.join(' | '));
    await fillContact(page, ENTRY);
    await page.click('.form-actions .btn-coral');
    st = await state();
    check('[contact] the reCAPTCHA check is required before sending', st.captcha === 'Error: Tick the box to confirm you are not a robot.' &&
      st.invalid.length === 0 && api.posts === 0, JSON.stringify(st));
    await page.click('#stub-captcha');
    await page.click('.form-actions .btn-coral');
    await page.waitForSelector('.form-success');
    st = await state();
    const mail = api.sent[0] && api.sent[0].payload;
    check('[contact] success only after the server confirms it', st.success === 'Thank you. Your message has been sent to Growth Lab. We will reply by email.' &&
      api.posts === 1 && api.verify.length === 1 && api.verify[0].token === 'test-token' && api.sent.length === 1 &&
      JSON.stringify(mail.to) === JSON.stringify([RECIPIENT]) && mail.reply_to === ENTRY.email && mail.text.includes(ENTRY.message), JSON.stringify(st));
    check('[contact] success message takes focus', (await page.evaluate(() => document.activeElement.className)) === 'form-success');
    check('[contact] server logs hold no visitor details', !api.logs.some((l) => PII.some((p) => l.includes(p))), api.logs.join(' / '));
    await page.screenshot({ path: path.join(SHOTS, 'contact-success.png'), fullPage: true });

    // reCAPTCHA refused by Google: not sent, check reset, clear message
    await loadContact(CONFIGURED, { captcha: 'fail', send: 'ok' });
    await fillContact(page, ENTRY);
    await page.click('#stub-captcha');
    await page.click('.form-actions .btn-coral');
    await page.waitForFunction(() => document.getElementById('form-status').textContent !== '');
    st = await state();
    check('[contact] failed reCAPTCHA: not sent, check reset, readable message', st.success === null && api.sent.length === 0 && st.resets >= 1 &&
      st.captcha === 'Error: We could not confirm the reCAPTCHA check. Tick the box again.' && st.status === 'Your message was not sent.', JSON.stringify(st));

    // Provider rejects the message: never reported as sent
    await loadContact(CONFIGURED, { captcha: 'ok', send: 'fail' });
    await fillContact(page, ENTRY);
    await page.click('#stub-captcha');
    await page.click('.form-actions .btn-coral');
    await page.waitForFunction(() => document.getElementById('form-status').textContent !== '');
    st = await state();
    check('[contact] provider failure: not sent, honest message', st.success === null && st.status === `Your message was not sent. Please try again, or email ${RECIPIENT}.` &&
      st.resets >= 1 && (await page.evaluate(() => !document.querySelector('.form-actions button').disabled)), JSON.stringify(st));

    // Not configured: the page says so and never posts
    await loadContact({}, {});
    const notice = await page.textContent('#form-notice');
    await fillContact(page, ENTRY);
    await page.click('.form-actions .btn-coral');
    st = await state();
    check('[contact] without configuration the form says so and sends nothing', notice === `Online enquiries are not connected yet. Please email ${RECIPIENT}.` &&
      st.status === `This form cannot send yet. Please email ${RECIPIENT}.` && api.posts === 0 && st.success === null &&
      (await page.evaluate(() => document.getElementById('recaptcha').hidden)), JSON.stringify(st));
    await page.screenshot({ path: path.join(SHOTS, 'contact-not-connected.png'), fullPage: true });
    await ctx.close();
  }

  // The narrowest phones: nothing may push the homepage sideways, and the profiles stack
  {
    const sctx = await browser.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 2 });
    const sp = await sctx.newPage();
    await sp.goto(base);
    await sp.waitForTimeout(800);
    await loadImages(sp);
    await pageChecks(sp, '[home 320px]', { sizing });
    const narrow = await sp.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const outside = [...document.querySelectorAll('body *')].filter((el) => {
        if (el.closest('.rune-stage, .sr-only, .skip')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5);
      }).map((el) => `${el.tagName}.${el.className}`).slice(0, 6);
      const person = document.querySelector('.person');
      return { outside, stacked: person.querySelector('img').getBoundingClientRect().bottom <= person.querySelector('h3').getBoundingClientRect().top };
    });
    check('[home 320px] nothing outside the screen, profiles stack', narrow.outside.length === 0 && narrow.stacked, narrow.outside.join(', '));
    await sp.screenshot({ path: path.join(SHOTS, 'small-320-full.png'), fullPage: true });
    await sctx.close();
  }

  // Reduced motion: the finished cube at once and a still rune
  {
    const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const rp = await rctx.newPage();
    await rp.goto(base);
    await rp.waitForTimeout(150);
    const rTop = await rp.getAttribute('.f-top', 'points');
    const rBuilding = await rp.evaluate(() => document.getElementById('device').className);
    check('[reduced motion] cube shows its final state at once', rTop === finalTop && !/building|pre-build/.test(rBuilding), rBuilding);
    await rp.locator('.rune-stage').scrollIntoViewIfNeeded();
    await rp.waitForTimeout(1500);
    const rRune = await rp.evaluate(() => ({ a: getComputedStyle(document.querySelector('.rune-a')).animationName, t: getComputedStyle(document.querySelector('.rune-a')).transform }));
    check('[reduced motion] rune stays still', rRune.a === 'none' && rRune.t === 'none', JSON.stringify(rRune));
    await rctx.close();
  }

  // Private Claude preview: the homepage wrapped the way the artifact host wraps it, plus the contact view
  const previewDir = path.join(ROOT, 'dist', 'preview');
  if (fs.existsSync(path.join(previewDir, 'index.html'))) {
    const wrapped = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,sans-serif;background:#fff;color:#000}</style></head><body>' +
      fs.readFileSync(path.join(previewDir, 'index.html'), 'utf8') + '</body></html>';
    fs.writeFileSync(path.join(previewDir, '_wrapped.html'), wrapped);
    const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const pp = await pctx.newPage();
    const perr = [], external = [];
    pp.on('pageerror', (e) => perr.push(String(e)));
    pp.on('request', (r) => { if (!/^(file|data):/.test(r.url())) external.push(r.url()); });
    await pp.goto('file://' + path.join(previewDir, '_wrapped.html'));
    await pp.waitForTimeout(3600);
    await loadImages(pp);
    const pv = await pp.evaluate(async () => { await document.fonts.ready; return {
      geist: document.fonts.check('600 16px Geist'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      external: [...document.querySelectorAll('link[href], script[src]')].map((e) => e.getAttribute('href') || e.getAttribute('src')),
      imgs: [...document.querySelectorAll('img')].map((i) => i.complete && i.naturalWidth > 0),
      actions: [...document.querySelectorAll('.btn')].map((a) => a.getAttribute('href')), mail: document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').length }; });
    check('[preview] homepage self contained: Geist, images from published files, no overflow, no requests out', pv.geist && pv.overflow <= 0 &&
      pv.external.length === 0 && perr.length === 0 && pv.imgs.length === 3 && pv.imgs.every(Boolean) && external.length === 0, JSON.stringify({ ...pv, external }));
    check('[preview] both actions open the published contact view', pv.actions.length === 2 && pv.actions.every((h) => h === 'contact.html') &&
      fs.existsSync(path.join(previewDir, 'contact.html')) && pv.mail === 0);
    await pctx.close();
    fs.unlinkSync(path.join(previewDir, '_wrapped.html'));

    const cctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const cp = await cctx.newPage();
    const cexternal = [];
    cp.on('request', (r) => { if (!/^(file|data):/.test(r.url())) cexternal.push(r.url()); });
    await cp.goto('file://' + path.join(previewDir, 'contact.html'));
    await cp.waitForTimeout(400);
    const cv = await cp.evaluate(() => ({ mode: document.getElementById('contact-form').dataset.mode, notice: document.getElementById('form-notice').textContent,
      noticeShown: !document.getElementById('form-notice').hidden, slot: document.getElementById('recaptcha').textContent,
      mail: document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').length, email: document.querySelector('.contact-details dd').textContent.trim(),
      phone: document.querySelectorAll('.contact-details dd')[1].textContent.trim(),
      home: document.querySelector('.site-header a').getAttribute('href'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    await fillContact(cp, ENTRY);
    await cp.click('.form-actions .btn-coral');
    const cstatus = await cp.textContent('#form-status');
    check('[preview] contact view says plainly it cannot send, and sends nothing', cv.mode === 'preview' && cv.noticeShown &&
      cv.notice === 'Preview only. This copy of the page is not connected to email, so nothing you enter is sent.' &&
      cv.slot === 'The Google reCAPTCHA check appears here on the live site.' &&
      cstatus === `Preview only: nothing was sent. On the live site this form sends your message to ${RECIPIENT}.` &&
      cexternal.length === 0 && !(await cp.$('.form-success')), JSON.stringify({ ...cv, cstatus, cexternal }));
    check('[preview] contact view: email and phone shown as text, not links, logo returns to index.html', cv.mail === 0 && cv.email === RECIPIENT &&
      cv.phone === PHONE.display && cv.home === 'index.html' && cv.overflow <= 0, `${cv.email}, ${cv.phone}`);
    await cp.screenshot({ path: path.join(SHOTS, 'contact-preview-mobile.png'), fullPage: true });
    await cctx.close();
    for (const n of ['privacy.html', 'terms.html']) {
      const html = fs.readFileSync(path.join(previewDir, n), 'utf8');
      check(`[preview] ${n} has no email links and returns to index.html`, !html.includes('mailto:') && html.includes('href="index.html"') && !html.includes('href="./"'));
    }
  }

  // Browser files: complete pages that open straight from a folder, with no server
  const browserDir = path.join(ROOT, 'dist', 'browser');
  if (fs.existsSync(path.join(browserDir, 'growth-lab-martech.html'))) {
    const bctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const bp = await bctx.newPage();
    const berr = [], requests = [];
    bp.on('pageerror', (e) => berr.push(String(e)));
    bp.on('request', (r) => { if (!/^(file|data):/.test(r.url())) requests.push(r.url()); });
    await bp.goto('file://' + path.join(browserDir, 'growth-lab-martech.html'));
    await bp.waitForTimeout(3600);
    const bv = await bp.evaluate(async () => {
      await document.fonts.ready;
      for (const i of document.querySelectorAll('img')) { i.scrollIntoView(); await i.decode().catch(() => {}); }
      return { geist: document.fonts.check('600 16px Geist'), cube: !document.getElementById('device').className.includes('pre-build'),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        imgs: [...document.querySelectorAll('img')].map((i) => i.complete && i.naturalWidth > 0 && i.src.startsWith('data:image/jpeg')),
        files: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^(#|mailto:|tel:|https:)/.test(h)),
        external: [...document.querySelectorAll('a[href^="http"]')].map((a) => a.getAttribute('href')),
        actions: [...document.querySelectorAll('.btn')].map((a) => a.getAttribute('href')) };
    });
    const missing = bv.files.filter((h) => !fs.existsSync(path.join(browserDir, h)));
    check('[browser file] homepage opens from a folder: Geist, cube, images built in, links resolve, no requests', bv.geist && bv.cube && bv.overflow <= 0 &&
      bv.imgs.length === 3 && bv.imgs.every(Boolean) && missing.length === 0 && requests.length === 0 && berr.length === 0 &&
      bv.actions.every((h) => h === 'growth-lab-contact.html') && JSON.stringify(bv.external) === JSON.stringify(['https://martechtribe.com/']),
      JSON.stringify({ ...bv, imgs: bv.imgs.length, missing, requests, errors: berr }));
    await bp.goto('file://' + path.join(browserDir, 'growth-lab-contact.html'));
    await bp.waitForTimeout(300);
    const bc = await bp.evaluate(() => ({ mode: document.getElementById('contact-form').dataset.mode, notice: !document.getElementById('form-notice').hidden,
      links: [...document.querySelectorAll('.contact-details a')].map((a) => a.getAttribute('href')), home: document.querySelector('.site-header a').getAttribute('href') }));
    check('[browser file] contact view opens offline in preview mode with working email and phone links', bc.mode === 'preview' && bc.notice &&
      JSON.stringify(bc.links) === JSON.stringify([`mailto:${RECIPIENT}`, PHONE.href]) && bc.home === 'growth-lab-martech.html' && requests.length === 0, JSON.stringify(bc));
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
  console.log('\nSizing');
  for (const line of sizing) console.log('  ' + line);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${path.relative(process.cwd(), SHOTS)}`);
  process.exit(failed.length ? 1 : 0);
})();
