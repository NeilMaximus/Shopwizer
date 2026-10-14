# Before launch

The site is ready to preview, not to publish. Clear every item below, with legal advice where marked, before deploying it to a public domain. Nothing here has been deployed, and the live growthlab.co.za site has not been changed.

## Legal (blocking)

- [ ] **Operating entity.** Confirm the legal name and registration number to show in the privacy notice and website terms. Growth Lab's contracts in Drive name Future Island (Pty) Ltd trading as Growth Lab, while one recent proposal says GrowthLab (Pty) Ltd. Confirm which entity runs the website.
- [ ] **Information Officer.** Name and contact address for POPIA.
- [ ] **Privacy notice.** Complete every CONFIRM item in `legal/DRAFT_PRIVACY_NOTICE.md`: hosting provider, what it logs and for how long, email provider, cross border transfers, retention, security summary, Information Regulator contact details. Have it reviewed.
- [ ] **Website terms.** Complete every CONFIRM item in `legal/DRAFT_WEBSITE_TERMS.md`, including whether section 43 of the Electronic Communications and Transactions Act applies. Have it reviewed.
- [ ] **Publish the approved versions.** Replace the drafts, rename the files without the `DRAFT_` prefix, remove the draft banner sentence, run `python3 scripts/build.py`, then remove the "Drafts, pending approval" label from the footer in `site/index.html` and the `noindex` rules for the two pages in `site/vercel.json`.

## Content and brand

- [ ] Neil signs off the copy and the cube, stage and rune treatment in the private preview.
- [ ] Copyright line reads "© 2026 Growth Lab". Change it if the approved entity name should appear instead.
- [ ] Logo: the inline SVG is the verified live growthlab.co.za artwork (confirmed 14 October 2026). Re-check if the brand team issues a newer master.

## Technical

- [ ] Choose the domain or path. If it replaces part of growthlab.co.za, plan that change with whoever runs the current site.
- [ ] Vercel project: root directory `growth-lab/site` (or the unzipped package), framework preset Other, no build command.
- [ ] Analytics and cookies: none today, so no cookie banner is needed. If any are added, update the privacy notice and add consent controls first.
- [ ] Run `node tests/verify.cjs` on the final build and keep the screenshots with the sign off.
