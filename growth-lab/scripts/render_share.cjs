/* Renders the research example as portrait images to send on WhatsApp: a cover, then the Apex Martech
   Matrix, what each position means, the Apex Score and what to fix first. Every word, dot and icon is
   taken from the live page markup (site/index.html, whose matrix comes from
   config/apex-retail-example.json), so the images never drift from the website. Only the frame is
   added: the verified logo at its own proportions, growthlab.co.za, and the light grey panel the
   carousel uses on the site. The MartechMap view is left out because it cannot be read at phone size.

   Each image is 1080 x 1350 px (4:5, shown whole in a WhatsApp chat), drawn at 480 x 600 CSS px and
   2.25 times density, with type sized for a phone screen. The run fails if any card overflows.

   Run after python3 scripts/build.py preview:
   NODE_PATH=$(npm root -g) node scripts/render_share.cjs
   Output: share/whatsapp/*.png. Rules: DESIGN_SYSTEM.md, section 11. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'share/whatsapp');
const W = 480, H = 600, SCALE = 2.25;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const CSS = `
  html, body { margin: 0; background: var(--gl-white); }
  body > :not(.share-deck):not(.share-sprite) { display: none !important; }
  .share-deck { display: grid; gap: 0; }
  .share { position: relative; display: flex; flex-direction: column; width: ${W}px; height: ${H}px; padding: 22px; overflow: hidden; background: var(--gl-white); }
  .share-top { display: flex; align-items: center; justify-content: space-between; flex: none; height: 26px; margin-bottom: 16px; }
  .share-top img { display: block; height: 24px; width: auto; }
  .share-top span { font-size: 13px; font-weight: var(--gl-weight-medium); color: var(--gl-ink-3); }
  .share-panel { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 20px; border-radius: 22px; background: var(--gl-panel); }
  .share-panel > .rc-credit, .share-cover > .rc-credit { margin-top: auto; padding-top: 12px; font-size: 12px; }
  .share .rc-title { font-size: 21px; line-height: 1.25; letter-spacing: -0.01em; text-wrap: wrap; }
  .share .rc-lede { margin-top: 6px; font-size: 13px; line-height: 1.38; }

  /* Cover: the research heading and what it tells you, from the page */
  .share-cover { display: flex; flex-direction: column; flex: 1; padding: 14px 4px 0; }
  .share-cover h2 { font-size: 35px; line-height: 1.08; letter-spacing: -0.025em; font-weight: var(--gl-weight-bold); color: var(--gl-coral); text-wrap: balance; }
  .share-cover .lede { margin-top: 20px; font-size: 16.5px; line-height: 1.5; color: var(--gl-ink-2); }
  .share-cover .lede-lead { font-weight: var(--gl-weight-semibold); color: var(--gl-ink); }
  .share-cover .lede p + p { margin-top: 0.6em; }
  .share-cover .list-label { margin-top: 24px; font-size: 14.5px; }
  .share-cover .benefits { margin-top: 10px; gap: 9px; }
  .share-cover .benefits li { font-size: 16.5px; padding-left: 22px; }

  /* Matrix */
  .share .matrix { margin-top: 10px; }
  .share .mx-name, .share .mx-tag { font-size: 12px; }
  .share .mx-axis { font-size: 13px; }
  .share .matrix { row-gap: 5px; padding-top: 4px; }
  .share .mx-plot { aspect-ratio: 7 / 5; }

  /* Positions, two by two as on a desktop */
  .share .quads { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
  .share .quad { padding: 13px 13px 12px; }
  .share .quad-tag { gap: 8px; font-size: 13px; }
  .share .q-icon { width: 28px; height: 28px; border-radius: 8px; }
  .share .q-icon svg { width: 17px; height: 17px; }
  .share .quad-what { margin-top: 8px; font-size: 14.5px; line-height: 1.3; }
  .share .quad-why { margin-top: 4px; margin-bottom: 10px; font-size: 12.5px; line-height: 1.42; }
  /* The example names alone: the card's place on the chart already says what they are */
  .share .quad-eg { padding-top: 9px; }
  .share .eg-label { display: none; }
  .share .eg-names span { font-size: 12.5px; padding: 2px 9px; }

  /* Score */
  .share .rc-points { margin-top: 12px; gap: 8px; }
  .share .rc-points li { font-size: 15.5px; line-height: 1.45; }
  .share .score { margin-top: 14px; padding: 16px; }
  .share-rows .score { margin-top: 0; padding: 16px 16px 14px; }
  .share-rows > .share-panel > .rc-credit, .share-rows .share-panel > .rc-credit { padding-top: 8px; }
  .share .score-head { font-size: 19px; }
  .share .score-head span { display: block; }
  .share .meter { margin-top: 16px; height: 12px; }
  .share .meter-key { font-size: 13px; margin-top: 12px; }
  /* The score card has room, so its type steps up */
  .share-score .rc-points { gap: 12px; }
  .share-score .rc-points li { font-size: 16.5px; text-wrap: pretty; }
  .share-score .score { margin-top: 24px; padding: 28px 18px; }
  .share-score .score-head { font-size: 23px; }
  .share-score .meter { height: 14px; margin-top: 22px; }
  .share-score .meter-key { font-size: 14px; margin-top: 14px; }
  .share .score-cols { margin-top: 0; padding-top: 0; border-top: 0; row-gap: 14px; }
  .share .score-strong { padding-top: 14px; }
  .share .score-col h4 { padding-bottom: 8px; }
  .share .score-col ul { gap: 0; margin-top: 0; }
  .share .score-col li { padding-block: 8px; }
  .share .score-col li { row-gap: 2px; }
  .share .s-name { font-size: 14px; }
  .share .s-how { font-size: 12.5px; }
`;

const server = http.createServer((req, res) => {
  let file = path.join(SITE, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(SITE)) { res.writeHead(403); return res.end(); }
  if (file.endsWith('/')) { file += 'index.html'; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(0, '127.0.0.1', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.addStyleTag({ content: CSS });
    const names = await page.evaluate(() => {
      const take = (sel, from = document) => {
        const node = from.querySelector(sel);
        if (!node) { throw new Error('missing ' + sel); }
        const copy = node.cloneNode(true);
        copy.removeAttribute('id');
        return copy;
      };
      const frame = (name, body, extra) => {
        const card = document.createElement('section');
        card.className = 'share' + (extra ? ' ' + extra : '');
        card.dataset.name = name;
        const top = document.createElement('div');
        top.className = 'share-top';
        top.innerHTML = '<img src="assets/brand/growthlab-logo.svg" alt="Growth Lab"><span>growthlab.co.za</span>';
        card.append(top, body);
        return card;
      };
      const panel = (...parts) => {
        const box = document.createElement('div');
        box.className = 'share-panel';
        box.append(...parts);
        return box;
      };
      const title = (text) => {
        const h = document.createElement('h3');
        h.className = 'rc-title';
        h.textContent = text;
        return h;
      };
      const credit = (text) => {
        const p = document.createElement('p');
        p.className = 'rc-credit';
        p.textContent = text;
        return p;
      };
      const slide = (id) => document.getElementById(id);

      const cover = document.createElement('div');
      cover.className = 'share-cover';
      // The introduction sits in two columns on the page; the cover sets it as one block
      const intro = document.querySelector('.evidence-intro');
      const lede = document.createElement('div');
      lede.className = 'lede';
      intro.querySelectorAll('.lede').forEach((l) => {
        const para = document.createElement('p');
        para.textContent = l.textContent.trim();
        if (l.classList.contains('lede-lead')) { para.className = 'lede-lead'; }
        lede.append(para);
      });
      cover.append(take('h2', intro), lede, take('.list-label', intro), take('.benefits', intro), credit('Research: MartechTribe.'));

      const matrix = slide('rc-matrix');
      const positions = slide('rc-positions');
      const score = slide('rc-score');
      const scoreTop = take('.score', score);
      scoreTop.querySelectorAll('.score-cols').forEach((n) => n.remove());
      const scoreRows = take('.score', score);
      scoreRows.querySelectorAll('.score-head, .meter, .meter-key').forEach((n) => n.remove());

      const deck = document.createElement('div');
      deck.className = 'share-deck';
      deck.append(
        frame('01-what-it-tells-you', cover),
        frame('02-where-you-sit', panel(take('.rc-title', matrix), take('.rc-lede', matrix), take('.matrix', matrix), take('.rc-credit', matrix))),
        frame('03-what-each-position-means', panel(take('.rc-title', positions), take('.quads', positions), take('.rc-credit', positions))),
        frame('04-your-apex-score', panel(title('Your Apex Score'), take('.rc-points', score), scoreTop, take('.rc-credit', score)), 'share-score'),
        frame('05-what-to-fix-first', panel(scoreRows, take('.rc-credit', score)), 'share-rows')
      );
      const sprite = document.getElementById('i-calendar').closest('svg');
      sprite.classList.add('share-sprite');
      document.body.append(deck);
      return Array.from(deck.children, (c) => c.dataset.name);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.share img')).every((i) => i.complete && i.naturalWidth > 0));

    // Every card must hold its content: nothing may run past the frame or the panel
    const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('.share')).map((card) => {
      const box = (card.querySelector('.share-panel') || card.querySelector('.share-cover'));
      const limit = box.getBoundingClientRect().bottom - parseFloat(getComputedStyle(box).paddingBottom) + 0.5;
      const kids = Array.from(box.children, (c) => c.getBoundingClientRect());
      const lowest = Math.max(...kids.map((r) => r.bottom));
      // The credit sits at the foot of the card, so the free space is the gap above it
      const free = kids[kids.length - 1].top - kids[kids.length - 2].bottom;
      return { name: card.dataset.name, spare: Math.round(limit - lowest + free), wide: card.scrollWidth - card.clientWidth };
    }));
    if (process.env.SHARE_DEBUG) {
      console.log(await page.evaluate(() => [...document.querySelectorAll('.share')].map((c) => c.dataset.name + ': ' +
        [...(c.querySelector('.share-panel') || c.querySelector('.share-cover')).children].map((k) => `${k.className || k.tagName} ${Math.round(k.getBoundingClientRect().height)}`).join(', ')).join('\n')));
    }
    const bad = overflow.filter((o) => o.spare < 0 || o.wide > 0);
    if (bad.length) { throw new Error('cards overflow: ' + JSON.stringify(bad)); }

    fs.mkdirSync(OUT, { recursive: true });
    for (const old of fs.readdirSync(OUT)) { if (old.endsWith('.png')) { fs.unlinkSync(path.join(OUT, old)); } }
    for (const name of names) {
      const file = path.join(OUT, name + '.png');
      await page.locator(`.share[data-name="${name}"]`).screenshot({ path: file });
      const spare = overflow.find((o) => o.name === name).spare;
      console.log('share:', path.relative(ROOT, file), `${W * SCALE}x${H * SCALE}`, `(${spare} px spare)`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}).on('error', (err) => { console.error(err); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error(err); process.exit(1); });
