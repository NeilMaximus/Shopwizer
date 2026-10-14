# Growth Lab website: Vercel package

The `site/` folder is the whole website: a static site. No framework, no build command, no external requests: the font, logo and rune are all served from this folder.

## Deploy to Vercel (when approved)

Do not deploy publicly until every item in `PRELAUNCH.md` is cleared. The privacy notice and website terms in this package are drafts.

Option A, from the Vercel dashboard:
1. Import the repository, or upload this folder.
2. Root directory: `growth-lab/site` in the repository, or `site` in this package.
3. Framework preset: Other. Build command: none. Output directory: leave as the root directory.

Option B, with the Vercel CLI from inside the `site` folder:
```
vercel          # preview deployment, private to your team by default
vercel --prod   # only after sign off
```

`vercel.json` sets caching for the font and assets, basic security headers, and `noindex` on the two draft legal pages.

## Preview locally

```
python3 -m http.server 8000 -d site
```
Then open http://localhost:8000. Fonts need a server, not a file opened directly.

## Contents

Everything below sits in `site/`. This README, `PRELAUNCH.md` and `DESIGN_SYSTEM.md` sit beside it so they are never deployed.

| Path | What |
| --- | --- |
| `index.html` | Make Your Martech Pay |
| `privacy.html`, `terms.html` | Draft legal pages, generated from the source repository's `legal/` folder |
| `assets/css/tokens.css` | Design tokens (edit the source copy in `tokens/`, not this one) |
| `assets/css/site.css` | Page styles and the Geist `@font-face` |
| `assets/js/site.js` | Cube build, rune breathing, copy email |
| `assets/fonts/geist/` | Geist variable woff2 (Latin, weights 400 to 700) and its SIL Open Font License |
| `assets/brand/` | Verified Growth Lab logo, the rune (logo paths 1 and 2) and the mark |
| `favicon.svg` | The mark |

## Licences

Geist is © 2023 Vercel, in collaboration with basement.studio, and licensed under the SIL Open Font License 1.1 (`assets/fonts/geist/OFL.txt`). The Growth Lab logo, rune and content belong to Growth Lab.
