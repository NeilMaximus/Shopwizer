# Growth Lab website

Source for the Growth Lab website, starting with Make Your Martech Pay. A static site with no framework and no build step on the host. It ships with a self hosted typeface, the real logo and rune, and draft legal pages.

- Design rules: `DESIGN_SYSTEM.md` (read first)
- Instructions for Claude: `CLAUDE.md`
- What must happen before going live: `PRELAUNCH.md`

## Layout

```
growth-lab/
  DESIGN_SYSTEM.md      durable design rules
  CLAUDE.md             project instructions for Claude sessions
  PRELAUNCH.md          launch checklist (legal drafts, entity, hosting)
  DEPLOY.md             Vercel deployment notes (the README inside the zip)
  tokens/               tokens.css (source of truth) and tokens.json
  legal/                draft privacy notice and website terms (Markdown)
  site/                 the deployable site, Vercel output directory
    index.html          Make Your Martech Pay
    privacy.html        generated draft, noindex
    terms.html          generated draft, noindex
    vercel.json         headers and caching
    assets/css          tokens.css (copied) and site.css
    assets/js/site.js   cube build, rune breathing, copy email
    assets/fonts/geist  Geist variable woff2 (Latin, 400 to 700) and OFL licence
    favicon.svg         the mark
    assets/brand        logo, rune and mark SVGs
  scripts/              build.py, build_font.py, extract_rune.py, gen_cube_svg.py
  tests/verify.cjs      Playwright checks and screenshots
  dist/                 build output (git ignored): preview, zip, screenshots
```

## Work on it

```
python3 scripts/build.py preview     # sync tokens, render legal drafts, write dist/preview
npm install --prefix tests           # once, installs Playwright for the checks
NODE_PATH=tests/node_modules node tests/verify.cjs
python3 scripts/build.py package     # dist/growth-lab-site.zip for Vercel
```

Preview locally with any static server, for example `python3 -m http.server -d site 8000`, then open http://localhost:8000.

## Sources

- Geist: Vercel's official `geist` npm package 1.7.2, SIL Open Font License 1.1. Rebuild with `scripts/build_font.py` (needs `fonttools` and `brotli`).
- Logo: the inline SVG from the growthlab.co.za header, verified by Neil on 14 October 2026.
- Brand colours: the growthlab.co.za stylesheet (`--acc-purple`, `--acc-coral`, `--acc-amber`).
