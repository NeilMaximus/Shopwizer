# Before launch

The site is ready to preview, not to publish. Clear every item below, with legal advice where marked, before deploying it to a public domain. Nothing here has been deployed, no accounts or services have been set up, and the live growthlab.co.za site has not been changed.

## Legal (blocking)

- [ ] **Operating entity.** Confirm the legal name and registration number to show in the privacy notice and website terms. Growth Lab's contracts in Drive name Future Island (Pty) Ltd trading as Growth Lab, while one recent proposal says GrowthLab (Pty) Ltd. Confirm which entity runs the website.
- [ ] **Information Officer.** Name and contact address for POPIA.
- [ ] **Privacy notice.** Complete every CONFIRM item in `legal/DRAFT_PRIVACY_NOTICE.md`: hosting provider, what it logs and for how long, the contact form and its email delivery provider (Resend), Google reCAPTCHA and whether it needs consent before it loads, phone and email enquiries, cross border transfers, retention, security summary, Information Regulator contact details. Have it reviewed.
- [ ] **Website terms.** Complete every CONFIRM item in `legal/DRAFT_WEBSITE_TERMS.md`, including whether section 43 of the Electronic Communications and Transactions Act applies. Have it reviewed.
- [ ] **Publish the approved versions.** Replace the drafts, rename the files without the `DRAFT_` prefix, remove the draft banner sentence, run `python3 scripts/build.py`, then remove the "Drafts, pending approval" label from the footers in `site/index.html` and `site/contact.html` and the `noindex` rules for the two pages in `site/vercel.json`.

## Content and brand

- [ ] Neil signs off the copy, the cube, the black four stage section, the rune and the contact view in the private preview.
- [ ] Copyright line reads "© 2026 Growth Lab". Change it if the approved entity name should appear instead.
- [ ] Logo: the inline SVG is the verified live growthlab.co.za artwork (confirmed 14 October 2026). Re-check if the brand team issues a newer master.
- [ ] MartechTribe figures: re-check them on martechtribe.com shortly before launch and update the page, its as at date and `SOURCES.md` together.
- [ ] Frans Riemersma and MartechTribe confirm the wording about them, including the research paragraph and map caption ("Through MartechTribe, Growth Lab draws on 1,634 benchmarked martech stacks…") and the credit line, his portrait, the workshop descriptions and the use of the MartechMap image on Growth Lab's own site.
- [ ] The research heading names Deloitte and Accenture in a question, as Neil chose. Consider a quick legal read of the comparison before launch.
- [ ] **Client logos.** Add the twelve genuine logos to `site/assets/clients/` (black variants on transparent, names in `config/client-logos.json`), run `python3 scripts/build.py` and check the strip on desktop and a phone, adjusting each logo's `scale` for even weight and the speed if needed. Ten are in Neil's folder; Sportsmans Warehouse and Famous Brands must come from their official sites. Confirm Growth Lab may show each client's logo.
- [x] Phone number: Neil confirmed +27 84 504 0505 on 14 October 2026. It shows on the contact view beside the email.

## Contact form (blocking for online enquiries)

The form is built and tested against mocked Google and Resend responses. It cannot send real email until these are done; until then it says so and points visitors to hello@growthlab.co.za, with the phone number beside it. Steps are in `DEPLOY.md`.

- [ ] Create Growth Lab's own Google reCAPTCHA v2 checkbox keys for the final domains and any preview domain used for testing.
- [ ] Set up Resend: verify a sending domain (agree the DNS records with whoever manages growthlab.co.za), create a sending only API key and choose the sender address.
- [ ] Add `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` and, ideally, `CONTACT_ALLOWED_HOSTNAMES` to the Vercel project, then redeploy.
- [ ] On a protected preview, send a test enquiry and confirm it reaches hello@growthlab.co.za with the right reply address, that an unticked check is refused, and that the logs hold no personal details.

## Technical

- [ ] Choose the domain or path. If it replaces part of growthlab.co.za, plan that change with whoever runs the current site.
- [ ] Vercel project: `site/` is the deployment root (Root Directory `growth-lab/site` in the repository, or `site` in the package), framework preset Other, no build command. Nothing outside `site/` is deployed.
- [ ] **Deployment Protection.** Do not assume previews are private. Before creating or sharing any preview, check Settings, Deployment Protection in the Vercel project: Vercel Authentication, or Password Protection where the plan includes it, must cover preview deployments. Note which production URLs and domains stay public, and open a preview signed out in a private window to confirm it asks for a sign in or password. See `DEPLOY.md`.
- [ ] Decide what Vercel deploys from: the zip with the CLI, or Git. The source sits in the Shopwizer repository on the `growth-lab-design-system` branch, beside an unrelated app at the root, and a connected repository deploys on every push.
- [ ] Analytics and cookies: the homepage has none. Once the form is connected, the contact view loads Google reCAPTCHA, so settle the consent question in the privacy item above before launch. If analytics are ever added, update the privacy notice and add consent controls first.
- [ ] Run `node tests/verify.cjs` on the final build and keep the screenshots with the sign off.
