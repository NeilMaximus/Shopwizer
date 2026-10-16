# CLAUDE.md, Growth Lab website

## What this repository is now

Since 14 October 2026 growthlab.co.za serves the "Make Your Martech Pay" website, release 2.11 (commit 8c82ab6, Vercel production deployment `dpl_7z58UUnGRmM8dWboN4SMpvtv4pmX`). It replaced the GrowthLab OS site.

The GrowthLab OS direction is retired: 03-blueprint/direction-brief.md, the window spec, Martian Mono and Instrument Sans, the boot sequence, windows, dock, terminal and GSAP are history only. Keep them in the repository, but never use them for the live site.

## Where the rules live

- `docs/site/DESIGN_SYSTEM.md` (version 2.11) is the design law for the live site. Read it before changing anything in `public/` or `api/`. Its rules are durable and supersede every earlier Growth Lab website direction.
- `docs/site/SOURCES.md`: every figure, logo source and licence. `docs/site/PRELAUNCH.md`: open items. `docs/site/DEPLOY.md`: the release mapping, checks and rollback.
- Paths in `docs/site/` follow the source layout: its `site/` folder is `public/` plus `api/` here.
- The editable source (tokens, build script, tests, legal drafts) is the `growth-lab/` folder of neilmaximus/shopwizer, branch `growth-lab-design-system`, release commit 5e3f6bc. It is archived in the GrowthLab shared drive under Brand Assets / Website / 2026-10-14 Production Release. `public/`, `api/` and `vercel.json` here are build output from it.

## How to change the live site

1. Make the change in the source, run `python3 scripts/build.py package` and `node tests/verify.cjs` there.
2. Copy `dist/growth-lab-2026/` into this repository: replace `public/` entirely, `api/contact.mjs` and `vercel.json`, in one commit to `main`.
3. Every commit to `main` goes straight to production. Rollback: Vercel Instant Rollback to the previous production deployment, then revert the commit.

Do not hand edit `public/` on its own: the next release from the source would silently overwrite the change.

## Hard rules (from DESIGN_SYSTEM.md)

- **Typeface: Geist Sans only**, self hosted from `public/assets/fonts/geist/`. Never Martian Mono, Geist Mono, Instrument Sans, Suisse or any monospace or terminal styling, anywhere. The four ways to work carry no 01 to 04 numbers.
- **Colours come from the tokens** (`public/assets/css/tokens.css`, generated from the source): brand purple `#7761FF`, brand coral `#FF4E4E`, amber `#FEBC2E` (very sparing), ink `#111111`. `#FF5F57` is not brand coral. Coral text only at large sizes on white, with one recorded exception, the regular weight first sentence of the research introduction; white text on coral only as the 19 px bold action label.
- **Grounds are fixed.** Header, hero, rune band, footer and the sections after the stages are white. The four ways section (Fix, Grow, Automate, Decide, four columns read top to bottom, no arrows) stays black `#111111`. Light grey only for supporting panels such as the contact form. No translucent, frosted or blurred surfaces.
- **Logo:** only the verified SVG, `public/assets/brand/growthlab-logo.svg` (viewBox `0 0 297 70`). Never retype, redraw or stretch it. Header 36 px high (30 px on phones), footer 30 px (26 px). The email signature logo, `public/assets/brand/growthlab-email-logo-v1.png`, sits at a stable public URL: never overwrite it; new artwork becomes a v2 file.
- **Motion:** the value cube's slow loop, the rune's slow breathing and the client logo strip only, with no pause buttons (Neil, 16 October 2026; a recorded WCAG 2.2.2 exception). The research carousel (version 2.12) moves only when the visitor asks, never on its own. Honour `prefers-reduced-motion`.
- **Actions:** the header holds the logo and one dark "Let’s Talk" pill, with no menu; it and the coral "Let’s Talk" in the getting going section both open `contact.html`. The homepage footer holds the logo and copyright; the contact view's footer has no logo.
- **Copy:** Neil's approved wording, word for word. UK English, no em dashes. MartechTribe's figures appear as one quiet row, never as tiles or counters. The only approved superlative is "the world’s largest independent benchmark of real martech stacks". No pricing, testimonials or invented facts. The research carousel's Apex Martech Matrix retail example (version 2.12) uses only MartechTribe's measured data, credited to MartechTribe and the CMO Council.
- **Client logos:** genuine artwork only, never redrawn, typeset or substituted. Six of twelve are present.
- **Contact form: sending is real or it is off.** `api/contact.mjs` fails closed. With no reCAPTCHA and Resend keys on Vercel, the contact view says online enquiries are not connected and points to hello@growthlab.co.za and +27 84 504 0505. Never add a fake send, and never describe the form as working until the keys are set and an end to end send is verified. Never reuse another site's keys or phone number.
- **Legal honesty:** never invent entity details, registration numbers or policies. The draft privacy notice and website terms are not published; they return only once approved.
- **Do not** change DNS or MX records (they carry Google Workspace mail), create accounts, buy anything or commit secrets.

## Working with Neil

- Neil is the founder and is learning agentic development. After each task, explain in two or three sentences what you did and why.
- Use plan mode for anything structural. Propose first, build after approval.
- Ask before adding any new dependency.
- All site copy and documents use UK English, and never use em dashes.

## Git

- Commit after every working change with a clear message.
- Never commit .env files or anything containing a secret.
