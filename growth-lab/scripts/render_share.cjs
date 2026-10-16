/* Renders the research example as portrait images to send on WhatsApp: a cover, then the four views of the
   research explorer: your position, what it means, your priorities and your next steps. Every word, dot and icon is
   taken from the live page markup (site/index.html, whose matrix comes from
   config/apex-retail-example.json), so the images never drift from the website. Only the frame is
   added: the verified logo at its own proportions, growthlab.co.za, and the light grey panel the
   carousel uses on the site. The MartechMap is left out because it cannot be read at phone size.

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
  .share-panel { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 18px; border-radius: 22px; background: var(--gl-panel); }
  .share-panel > .rc-credit, .share-cover > .rc-credit { margin-top: auto; padding-top: 10px; font-size: 12px; }
  .share .rc-title { font-size: 20px; line-height: 1.25; letter-spacing: -0.01em; text-wrap: wrap; }
  .share .rc-lede { margin-top: 5px; font-size: 13px; line-height: 1.4; }
  .share .rc-lede + .rc-lede { margin-top: 5px; }
  .share .rx-label { margin: 12px 0 8px; padding: 3px 10px 3px 8px; font-size: 12.5px; }
  /* The picture never shrinks, so the overflow check below sees anything that would spill */
  .share .rx-visual { display: flex; flex-direction: column; flex: none; }
  .share .rx-visual:has(.matrix) { margin-top: 8px; }

  /* Cover: the research heading, its coral line, the supporting line and the four views */
  .share-cover { display: flex; flex-direction: column; flex: 1; padding: 14px 4px 0; }
  .share-cover h2 { font-size: 36px; line-height: 1.08; letter-spacing: -0.025em; font-weight: var(--gl-weight-bold); color: var(--gl-coral); text-wrap: balance; }
  .share-cover .lede { margin-top: 20px; font-size: 17px; line-height: 1.5; color: var(--gl-ink-2); }
  .share-cover .lede-lead { font-weight: var(--gl-weight-semibold); color: var(--gl-ink); }
  .share-cover .lede p + p { margin-top: 0.7em; }
  .share-steps { display: grid; gap: 10px; margin-top: 26px; }
  .share-steps li { display: flex; align-items: center; gap: 12px; font-size: 17px; font-weight: var(--gl-weight-semibold); color: var(--gl-ink); }
  .share-steps .rx-ico { width: 32px; height: 32px; background: var(--gl-purple); color: var(--gl-white); }

  /* Your position */
  .share .matrix { row-gap: 5px; }
  .share .mx-top .rx-label { margin: 0; }
  .share .mx-name, .share .mx-tag { font-size: 12px; }
  .share .mx-axis { font-size: 12.5px; }
  .share .mx-plot { aspect-ratio: 9 / 5; }

  /* What it means: two by two as on a desktop */
  .share .quads { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .share .quad { padding: 11px; }
  .share .quad-tag { gap: 7px; font-size: 12.5px; }
  .share .q-icon { width: 24px; height: 24px; border-radius: 7px; }
  .share .q-icon svg { width: 15px; height: 15px; }
  .share .quad-what { margin-top: 7px; font-size: 13.5px; line-height: 1.3; }
  .share .quad-why { margin-top: 3px; font-size: 12px; line-height: 1.4; }
  .share .quad { grid-template-areas: "tag tag" "eg eg" "what what" "why why"; }
  .share .quad-eg { margin-top: 6px; justify-self: start; }
  .share .eg-names span { font-size: 11.5px; padding: 1px 8px; }

  /* Your priorities */
  .share .score { padding: 14px 14px 12px; }
  .share .score-head { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .share .score-stat { font-size: 13px; }
  .share .score-value strong { font-size: 26px; }
  .share .meter { margin-top: 10px; height: 10px; }
  .share .score-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--gl-line); }
  .share .score-fix { padding: 0 12px 0 0; border: 0; }
  .share .score-strong { padding: 0 0 0 12px; border: 0; border-left: 1px solid var(--gl-line); }
  .share .score-col h4 { padding-bottom: 6px; font-size: 12.5px; }
  .share .score-col h4 small { font-size: 12px; }
  .share .score-col li { column-gap: 8px; padding-block: 7px; row-gap: 1px; }
  .share .s-icon { width: 18px; height: 18px; }
  .share .score-col li { grid-template-columns: 18px minmax(0, 1fr) auto; }
  .share .score-strong li { grid-template-columns: 18px minmax(0, 1fr); }
  .share .s-name { font-size: 12.5px; }
  /* The card keeps the areas and their points; the notes stay on the website */
  .share .s-how { display: none; }
  .share .s-pts { min-width: 32px; padding: 2px 6px; font-size: 12px; }

  /* Your next steps */
  .share .plan { gap: 6px; }
  .share .plan-step { grid-template-columns: 96px minmax(0, 1fr); grid-template-areas: "phase what" "owner what"; align-items: start; padding: 8px 11px; gap: 3px 10px; }
  .share .plan-owner { text-align: left; align-items: flex-start; }
  .share .plan-phase { font-size: 12px; padding: 2px 8px; }
  .share .plan-priority { font-size: 13px; line-height: 1.3; }
  .share .plan-action { margin-top: 1px; font-size: 12px; line-height: 1.35; }
  .share .plan-owner { font-size: 12px; line-height: 1.3; }
  /* One header row names the columns, instead of an Owner label on every step */
  .share .plan-owner small { display: none; }
  .share-plan-head { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 10px; padding: 0 11px; font-size: 11.5px; font-weight: var(--gl-weight-semibold); color: var(--gl-ink-3); }
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
      // The introduction sits in two columns on the page; the cover sets it as one block, then names the four views
      const intro = document.querySelector('.evidence-intro');
      const lede = document.createElement('div');
      lede.className = 'lede';
      intro.querySelectorAll('.lede').forEach((l) => {
        const para = document.createElement('p');
        para.textContent = l.textContent.trim();
        if (l.classList.contains('lede-lead')) { para.className = 'lede-lead'; }
        lede.append(para);
      });
      const steps = document.createElement('ul');
      steps.className = 'share-steps';
      document.querySelectorAll('.rx-tab').forEach((tab) => {
        const li = document.createElement('li');
        li.append(tab.querySelector('.rx-ico').cloneNode(true), tab.textContent.trim());
        steps.append(li);
      });
      cover.append(take('h2', intro), lede, steps, credit('Research: MartechTribe.'));

      // Each view as on the page: its words, its picture and its credit
      const view = (id) => {
        const v = slide(id);
        return panel(...[...v.querySelector('.rx-text').children, v.querySelector('.rx-visual'), v.querySelector('.rc-credit')].map((n) => {
          const copy = n.cloneNode(true);
          copy.removeAttribute('id');
          return copy;
        }));
      };

      const deck = document.createElement('div');
      deck.className = 'share-deck';
      deck.append(
        frame('01-what-it-tells-you', cover),
        frame('02-your-position', view('rc-matrix')),
        frame('03-what-it-means', view('rc-positions')),
        frame('04-your-priorities', view('rc-score')),
        frame('05-your-next-steps', view('rc-plan'))
      );
      deck.querySelectorAll('.plan').forEach((plan) => {
        const head = document.createElement('li');
        head.className = 'share-plan-head';
        head.innerHTML = '<span>Phase and owner</span><span>Priority and action</span>';
        plan.prepend(head);
      });
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
