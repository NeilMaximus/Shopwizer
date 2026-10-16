/* Renders the link preview image (Open Graph, 1200 x 630) that WhatsApp, LinkedIn, Slack and search
   results show when someone shares growthlab.co.za: white, the verified logo at its own proportions,
   the hero headline in Geist and the site address. Nothing is typed in place of the logo.

   Run: NODE_PATH=$(npm root -g) node scripts/render_og_image.cjs
   Output: site/assets/brand/growthlab-og.png. Rules: DESIGN_SYSTEM.md, section 18. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(SITE, 'assets/brand/growthlab-og.png');
const W = 1200, H = 630;

(async () => {
  const font = fs.readFileSync(path.join(SITE, 'assets/fonts/geist/Geist-Variable-Latin.woff2')).toString('base64');
  const logo = fs.readFileSync(path.join(SITE, 'assets/brand/growthlab-logo.svg')).toString('base64');
  const h1 = /<h1 id="hero-title">([^<]+)<\/h1>/.exec(fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'))[1];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Geist; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 400 700; }
    html, body { margin: 0; width: ${W}px; height: ${H}px; background: #FFFFFF; }
    body { box-sizing: border-box; padding: 72px 84px; display: flex; flex-direction: column; font-family: Geist, sans-serif; color: #111111; }
    img { display: block; align-self: flex-start; height: 56px; width: auto; }
    h1 { margin: auto 0 0; max-width: 900px; font-size: 84px; line-height: 1.02; letter-spacing: -0.035em; font-weight: 700; }
    p { margin: 40px 0 0; display: flex; align-items: center; gap: 18px; font-size: 28px; font-weight: 500; color: #404040; }
    p i { width: 14px; height: 14px; border-radius: 4px; background: #7761FF; }
    p i + i { background: #FF4E4E; } p i + i + i { background: #FEBC2E; }
  </style></head><body><img src="data:image/svg+xml;base64,${logo}" alt="">
    <h1>${h1}</h1><p><i></i><i></i><i></i>growthlab.co.za</p></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();
  console.log('link preview image:', path.relative(ROOT, OUT), `${W}x${H}`);
})().catch((err) => { console.error(err); process.exit(1); });
