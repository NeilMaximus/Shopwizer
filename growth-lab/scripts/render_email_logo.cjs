/* Renders the email logo PNG from the verified logo SVG, unchanged: same paths, the file's own black
   fill, transparent background. 840 x 198 is three times the 280 x 66 display size used in email
   signatures, so it stays sharp on high density screens. The artwork is scaled uniformly (297 x 70
   viewBox, aspect kept), never stretched.

   The published URL /assets/brand/growthlab-email-logo-v1.png must stay stable because sent emails
   keep pointing at it: never overwrite v1 with different artwork. A changed logo gets a new file,
   growthlab-email-logo-v2.png, and v1 stays in place.

   Run: NODE_PATH=$(npm root -g) node scripts/render_email_logo.cjs */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SVG = path.join(ROOT, 'site/assets/brand/growthlab-logo.svg');
const OUT = path.join(ROOT, 'site/assets/brand/growthlab-email-logo-v1.png');
const W = 840, H = 198;

(async () => {
  const svg = fs.readFileSync(SVG);
  const src = 'data:image/svg+xml;base64,' + svg.toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent}
    img{display:block;width:${W}px;height:${H}px}</style></head><body><img src="${src}" alt=""></body></html>`);
  await page.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
  await page.screenshot({ path: OUT, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();
  console.log('email logo:', path.relative(ROOT, OUT), `${W}x${H}`);
})().catch((err) => { console.error(err); process.exit(1); });
