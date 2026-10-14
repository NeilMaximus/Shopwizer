# Growth Lab website: Vercel package

**`site/` is the deployment root.** It holds the whole website: a static site with no framework, no build command and no external requests, so the font, logo and rune are all served from it. Nothing outside `site/` is deployed. This README, `PRELAUNCH.md` and `DESIGN_SYSTEM.md` sit beside it on purpose.

## Before any deployment

Do not deploy publicly until every item in `PRELAUNCH.md` is cleared. The privacy notice and website terms in this package are drafts.

Do not assume a Vercel preview is private. Who can open a preview depends on the project's Deployment Protection settings and on your Vercel plan, so check them before you create or share one:

1. In the Vercel dashboard, open the project, then Settings, then Deployment Protection.
2. Confirm that Vercel Authentication, or Password Protection where your plan includes it, is switched on and that its scope covers preview deployments.
3. Note what the scope leaves out. Production URLs and custom domains can stay public even when previews are protected.
4. After deploying, open the preview URL in a private browser window while signed out. You should be asked to sign in or enter a password. If the page simply loads, it is public: remove the deployment and fix the settings before sharing anything.

With the Vercel CLI, `vercel project protection` shows the current settings for a linked project.

## Deploy to Vercel (when approved)

Project settings:

| Setting | Value |
| --- | --- |
| Root Directory | `site` in this package, or `growth-lab/site` in the source repository |
| Framework preset | Other |
| Build command | None |
| Output directory | Leave the default |

Option A, the Vercel CLI, run from inside the `site` folder of this package so that only `site/` is uploaded:
```
vercel link                 # create or link the project without deploying
vercel project protection   # check protection before the first deployment
vercel                      # preview deployment, then open it signed out to confirm it is protected
vercel --prod               # production: only after PRELAUNCH.md is cleared and Neil signs off
```

Option B, Git: import the source repository in the Vercel dashboard and set the Root Directory to `growth-lab/site`. Selecting Deploy creates a deployment straight away, and once the repository is connected Vercel deploys on every push: production from the production branch, previews from the others. Check the production branch and Deployment Protection before you connect. The repository also holds an unrelated app at its root, which the Root Directory setting keeps out of this project.

`vercel.json` sets caching for the font and assets, basic security headers, and `noindex` on the two draft legal pages.

## Preview locally

```
python3 -m http.server 8000 -d site
```
Then open http://localhost:8000. Fonts need a server, not a file opened directly.

## Contents

Everything below sits in `site/`, the deployment root.

| Path | What |
| --- | --- |
| `index.html` | Make Your Martech Pay |
| `privacy.html`, `terms.html` | Draft legal pages, generated from the source repository's `legal/` folder |
| `vercel.json` | Headers and caching |
| `assets/css/tokens.css` | Design tokens (edit the source copy in `tokens/`, not this one) |
| `assets/css/site.css` | Page styles and the Geist `@font-face` |
| `assets/js/site.js` | Cube build, rune breathing, copy email |
| `assets/fonts/geist/` | Geist variable woff2 (Latin, weights 400 to 700) and its SIL Open Font License |
| `assets/brand/` | Verified Growth Lab logo, the rune (logo paths 1 and 2) and the mark |
| `favicon.svg` | The mark |

## Licences

Geist is © 2023 Vercel, in collaboration with basement.studio, and licensed under the SIL Open Font License 1.1 (`assets/fonts/geist/OFL.txt`). The Growth Lab logo, rune and content belong to Growth Lab.
