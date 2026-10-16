# Growth Lab website

Source for the Growth Lab website: Make Your Martech Pay and its contact view. Static pages with no framework and no build step on the host, plus one serverless function that sends the contact form. It ships with a self hosted typeface, the real logo and rune, and draft legal pages.

- Design rules: `DESIGN_SYSTEM.md` (read first)
- Instructions for Claude: `CLAUDE.md`
- Figures, links, images and contact details with their sources: `SOURCES.md`
- What must happen before going live, including connecting the form: `PRELAUNCH.md`

## Layout

```
growth-lab/
  DESIGN_SYSTEM.md      durable design rules
  CLAUDE.md             project instructions for Claude sessions
  PRELAUNCH.md          launch checklist (legal drafts, entity, contact form, hosting)
  SOURCES.md            every figure, link, image and contact detail, with sources and date
  DEPLOY.md             Vercel deployment, protection and form set up (the README inside the zip)
  .env.example          the contact function's environment variables, without values
  config/contact.json   the contact email and Neil's phone number, written into the contact view
  config/client-logos.json  the client logo strip: brands, order, scale, speed and sources
  tokens/               tokens.css (source of truth) and tokens.json
  legal/                the approved privacy notice and website terms (Markdown)
  site/                 the deployment root (Vercel Root Directory), nothing else is deployed
    index.html          Make Your Martech Pay
    contact.html        the contact view and form
    api/contact.mjs     serverless function: validate, verify reCAPTCHA, send through Resend
    privacy.html        the approved privacy notice, as published
    terms.html          the approved website terms, as published
    vercel.json         headers and caching
    assets/css          tokens.css (copied) and site.css
    assets/js/site.js   cube build, rune breathing and the logo strip
    assets/js/contact.js  contact form behaviour
    assets/fonts/geist  Geist variable woff2 (Latin, 400 to 700) and OFL licence
    favicon.svg         the mark
    assets/brand        logo, rune and mark SVGs
    assets/media        MartechMap 2026 (800 and 1600 px) and the two portraits
    assets/clients      genuine client logos for the strip (black on transparent), added when supplied
  scripts/              build.py, build_font.py, extract_rune.py, gen_cube_svg.py
  tests/verify.cjs      Playwright checks, the contact function's tests and screenshots
  dist/                 build output (git ignored): preview, browser files, zip, screenshots
```

## Work on it

```
python3 scripts/build.py preview     # sync tokens, check the legal pages, render the phone line, write dist/preview and dist/browser
npm install --prefix tests           # once, installs Playwright for the checks
NODE_PATH=tests/node_modules node tests/verify.cjs
python3 scripts/build.py package     # dist/growth-lab-site.zip for Vercel, with api/ and .env.example
```

To look at it in a normal browser without a server, open `dist/browser/growth-lab-martech.html` (font, styles, scripts and images are built in; keep `growth-lab-contact.html` and the two legal files beside it). Or use any static server, for example `python3 -m http.server -d site 8000`, then open http://localhost:8000.

The contact form can only send from a Vercel deployment with its environment variables set (see `DEPLOY.md`). Everywhere else it is honest about it: a static server shows "Online enquiries are not connected yet", and the browser files and the Claude preview run it in preview mode, which says nothing is sent.

`dist/preview/` is for the private Claude artifact only. Its viewer can blank the page after an email or phone link, so there the address and number show as plain text. Publish its `contact.html`, legal pages and `assets/media/` files with the page.

## Sources

- Geist: Vercel's official `geist` npm package 1.7.2, SIL Open Font License 1.1. Rebuild with `scripts/build_font.py` (needs `fonttools` and `brotli`).
- Logo: the inline SVG from the growthlab.co.za header, verified by Neil on 14 October 2026.
- Brand colours: the growthlab.co.za stylesheet (`--acc-purple`, `--acc-coral`, `--acc-amber`).
- Phone: +27 84 504 0505, confirmed by Neil on 14 October 2026.
