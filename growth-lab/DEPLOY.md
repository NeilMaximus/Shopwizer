# Growth Lab website: Vercel package

**`site/` is the deployment root.** It holds the whole website: static pages with no framework and no build command, plus one serverless function, `api/contact.mjs`, which sends the contact form. The font, logo, images and scripts are all served from it. Nothing outside `site/` is deployed. This README, `PRELAUNCH.md`, `DESIGN_SYSTEM.md`, `SOURCES.md` and `.env.example` sit beside it on purpose.

## Before any deployment

Neil authorised the production launch on 14 October 2026 and the 2.12 release on 16 October 2026. The open items in `PRELAUNCH.md` still stand. The privacy notice and website terms are approved and published (since 14 October 2026), and the production build carries them and their footer links. The contact form has no keys yet, so it says online enquiries are not connected and points to hello@growthlab.co.za and the phone number.

Do not assume a Vercel preview is private. Who can open a preview depends on the project's Deployment Protection settings and on your Vercel plan, so check them before you create or share one:

1. In the Vercel dashboard, open the project, then Settings, then Deployment Protection.
2. Confirm that Vercel Authentication, or Password Protection where your plan includes it, is switched on and that its scope covers preview deployments.
3. Note what the scope leaves out. Production URLs and custom domains can stay public even when previews are protected.
4. After deploying, open the preview URL in a private browser window while signed out. You should be asked to sign in or enter a password. If the page simply loads, it is public: remove the deployment and fix the settings before sharing anything.

With the Vercel CLI, `vercel project protection` shows the current settings for a linked project.

## Release into the live project (version 2.12.1)

growthlab.co.za is served by the Vercel project `growth-lab-2026` (team "Neil's projects", `neils-projects-23ef481a`). It deploys from `main` of the GitHub repository NeilMaximus/Growth-Lab-2026 with Framework Other, an empty Root Directory, `outputDirectory: public` from that repository's `vercel.json` and no build command; `www` redirects (308) to the apex. Every commit to `main` goes straight to production.

`python3 scripts/build.py package` also writes `dist/growth-lab-2026-release.zip`, this site laid out for that repository:

| In the release ZIP | Goes to, in Growth-Lab-2026 | Why |
| --- | --- | --- |
| `public/` | `public/`, replacing its contents entirely | The served files. Removing the old page, fonts, vendor scripts and media stops stale files being served; they stay in Git history and in the rollback deployment |
| `api/contact.mjs` | `api/contact.mjs` at the repository root | Vercel builds functions only from `api/` under the Root Directory, never from the output directory |
| `vercel.json` | `vercel.json` at the repository root, replacing it | Keeps `outputDirectory: public` and adds this site's caching and security headers. `cleanUrls` is left off, so `contact.html` and the asset paths behave exactly as tested |

Commit those three in one commit to `main`; leave everything else in that repository alone. Before copying, compare `main` with the last release: anything changed there directly (as the approved legal pages, footer links and LinkedIn icon were on 14 October 2026) must first be brought into this source, or the release will undo it. Release 2.12.1 went out on 16 October 2026 as commit 63d2566 (source ae2b7db), deployment `dpl_ACK51GxLAh6kP1ymoBjQxY85sNjP`. Rollback: Instant Rollback in the Vercel dashboard to the previous production deployment (`dpl_FuSzJtRCGjMc5XovVF578SvMA8YK`, commit a09bd7b, release 2.12), or revert the commit. Release 2.11 (`dpl_EuMJqdedJrkNN6WzoJdobgas2uvQ`, commit f0f4b97) is the one before that.

After the deployment is ready, check: the homepage and `/contact.html` load on growthlab.co.za, `www` still redirects, `/api/contact` answers `{"ready":true,"siteKey":"…"}` (the keys have been set since the first launch; `ready:false` would mean they are missing and the contact view says enquiries are not connected), `/privacy.html` and `/terms.html` return the approved pages, and `/assets/brand/growthlab-email-logo-v1.png` returns the PNG. Since 2.12.1, also check that `/robots.txt` and `/sitemap.xml` load and that the homepage served matches `dist/growth-lab-2026/public/index.html`. All of these passed for release 2.12.1 on 16 October 2026 (the live homepage was byte for byte the build).

## Deploy to Vercel (when approved)

Project settings:

| Setting | Value |
| --- | --- |
| Root Directory | `site` in this package, or `growth-lab/site` in the source repository |
| Framework preset | Other |
| Build command | None |
| Output directory | Leave the default |
| Node.js version | The current default (the function needs Node 18 or later) |

Option A, the Vercel CLI, run from inside the `site` folder of this package so that only `site/` is uploaded:
```
vercel link                 # create or link the project without deploying
vercel project protection   # check protection before the first deployment
vercel                      # preview deployment, then open it signed out to confirm it is protected
vercel --prod               # production: only after PRELAUNCH.md is cleared and Neil signs off
```

Option B, Git: import the source repository in the Vercel dashboard and set the Root Directory to `growth-lab/site`. Selecting Deploy creates a deployment straight away, and once the repository is connected Vercel deploys on every push: production from the production branch, previews from the others. Check the production branch and Deployment Protection before you connect. The repository also holds an unrelated app at its root, which the Root Directory setting keeps out of this project. The function is an ES module (`.mjs`) so that app's `package.json` cannot change how it loads.

`vercel.json` sets caching for the font and assets, basic security headers, and `noindex` on the two legal pages (as live). The function sets `Cache-Control: no-store` on its own responses.

## Connect the contact form (when approved)

The form sends each enquiry to hello@growthlab.co.za. The recipient is fixed in `api/contact.mjs` and can never come from the request. Until all four required settings below are in place, the contact view says "Online enquiries are not connected yet. Please email hello@growthlab.co.za." and the function refuses to send. It also refuses, and the page says the message was not sent, if the reCAPTCHA check fails or Google or Resend cannot be reached or refuse the request.

1. **Google reCAPTCHA keys.** In the reCAPTCHA admin console (https://www.google.com/recaptcha/admin), register Growth Lab's own site: type "Challenge (v2)", the "I'm not a robot" checkbox, with the domains growthlab.co.za, www.growthlab.co.za and any preview domain you will test on, such as the project's `vercel.app` domain. Google now keeps these keys in a Google Cloud project; check its current terms and free allowance when you create them. Copy the site key and the secret key (in Google Cloud it may be called the legacy secret key). Never reuse another website's keys.
2. **Resend.** In a Resend account, add and verify a sending domain by adding the DNS records Resend shows. A subdomain such as `mail.growthlab.co.za` keeps this apart from everyday email; agree any DNS change with whoever manages growthlab.co.za. Create an API key with sending access only, and choose a sender address on the verified domain, for example `Growth Lab website <website@mail.growthlab.co.za>`.
3. **Vercel environment variables.** In the project, Settings, Environment Variables, add the values from `.env.example` for Production, and for Preview if you will test on a protected preview. Mark the secret key and the API key as sensitive. Variables apply to new deployments only, so redeploy afterwards.

   | Variable | Value |
   | --- | --- |
   | `RECAPTCHA_SITE_KEY` | The reCAPTCHA site key (public, sent to the page) |
   | `RECAPTCHA_SECRET_KEY` | The reCAPTCHA secret key (never sent to the page) |
   | `RESEND_API_KEY` | The Resend API key |
   | `CONTACT_FROM_EMAIL` | The sender, on the domain verified in Resend |
   | `CONTACT_ALLOWED_HOSTNAMES` | Optional. Comma separated hostnames reCAPTCHA must report, such as `growthlab.co.za,www.growthlab.co.za`. Add the preview hostname while testing there |

4. **Test on a protected preview.**
   - `GET /api/contact` returns `{"ready":true,"siteKey":"…"}` and nothing else.
   - The contact view shows the reCAPTCHA checkbox, not the "not connected" notice.
   - Send a test enquiry. It arrives at hello@growthlab.co.za, and replying goes to the address entered in the form.
   - Submitting without ticking the box is refused on the page.
   - The function logs show `contact: sent` and outcome codes only, never names, addresses or messages.

`.env.example` lists the same variables without values. Never commit real values.

## Preview locally

```
python3 -m http.server 8000 -d site
```
Then open http://localhost:8000. Fonts need a server, not a file opened directly. A plain static server has no `/api`, so the contact view shows its "not connected" notice. `node tests/verify.cjs` runs the real function with Google and Resend answered by mocks, and covers success and every failure path.

## Contents

Everything below sits in `site/`, the deployment root.

| Path | What |
| --- | --- |
| `index.html` | Make Your Martech Pay |
| `contact.html` | The contact view: heading, email and phone, and the form |
| `api/contact.mjs` | Serverless function: validates the enquiry, verifies reCAPTCHA with Google, sends the email through Resend |
| `privacy.html`, `terms.html` | The approved privacy notice and website terms, exactly as published on 14 October 2026 (text in the source repository's `legal/` folder) |
| `vercel.json` | Headers and caching |
| `assets/css/tokens.css` | Design tokens (edit the source copy in `tokens/`, not this one) |
| `assets/css/site.css` | Page styles and the Geist `@font-face` |
| `assets/js/site.js` | Cube build, rune breathing and the client logo strip |
| `assets/js/contact.js` | Contact form: validation, the reCAPTCHA check, sending and honest status messages |
| `assets/fonts/geist/` | Geist variable woff2 (Latin, weights 400 to 700) and its SIL Open Font License |
| `assets/brand/` | Verified Growth Lab logo, the rune (logo paths 1 and 2), the mark, and `growthlab-email-logo-v1.png`, the email signature logo (keep its URL stable) |
| `assets/media/` | MartechMap 2026 by chiefmartec and MartechTribe (800 and 1600 px) and the two portraits |
| `assets/clients/` | Genuine client logos for the strip in the hero, once supplied (see `SOURCES.md`) |
| `favicon.svg` | The mark |

## Licences

Geist is © 2023 Vercel, in collaboration with basement.studio, and licensed under the SIL Open Font License 1.1 (`assets/fonts/geist/OFL.txt`). The Growth Lab logo, rune and content belong to Growth Lab. The MartechMap belongs to chiefmartec and MartechTribe and must keep its credit; sources for every figure are in `SOURCES.md`.
