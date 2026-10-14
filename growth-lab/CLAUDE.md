# Growth Lab website: instructions for Claude

This folder holds the Growth Lab website (Make Your Martech Pay and the pages that follow). Read `DESIGN_SYSTEM.md` before changing anything here. Its rules are durable and supersede earlier Growth Lab website styling.

## Hard rules

- **Typeface: Geist Sans only**, self hosted from `site/assets/fonts/geist/`. Never use Martian Mono, Geist Mono, Instrument Sans or any monospace or terminal styling in website UI, including navigation, labels, buttons, the footer and numbering such as 01 to 04.
- **Colours come from `tokens/tokens.css`.** Brand purple `#7761FF`, brand coral `#FF4E4E`, amber `#FEBC2E` (very sparing). `#FF5F57` is not brand coral. Coral text only at large sizes on white.
- **Section grounds are fixed.** Header, hero, rune band and footer are white. The four stage section (Diagnose, Prioritise, Unlock, Optimise) stays **black `#111111`**: purple icon tiles and arrows, coral headings, white taglines, light grey body text, all in Geist. Light grey (`--gl-panel`) is only for supporting sections, boxes and panels and never replaces the black section. No translucent, frosted or blurred surfaces.
- **Logo:** only `site/assets/brand/growthlab-logo.svg`, the verified SVG from growthlab.co.za (viewBox `0 0 297 70`). Never retype, redraw or stretch it.
- **Rune:** paths 1 and 2 of that logo, geometry unchanged (`growthlab-rune.svg`). Faint grey, oversized, cropped by the hairline above the footer, slow breathing motion only.
- **Keep the value cube and its build animation.** Honour `prefers-reduced-motion`.
- **Copy:** UK English, concise, Neil's approved words. No em dashes.
- **Legal honesty:** never invent entity details, registration numbers, addresses or compliance claims. Privacy and terms stay marked as drafts until `PRELAUNCH.md` is cleared.
- **Do not deploy, change the live growthlab.co.za site or buy anything** unless Neil asks.

## Workflow

1. Edit tokens in `tokens/tokens.css`, legal text in `legal/*.md`, pages in `site/`.
2. `python3 scripts/build.py preview` syncs tokens, renders the draft legal pages, writes the artifact preview to `dist/preview/` (no email links: the Claude viewer can go blank after one, so "Talk to us" copies the address) and writes `dist/browser/`, complete pages that open straight from a folder in any browser.
3. `node tests/verify.cjs` (Playwright) checks fonts, mono free text, logo and rune geometry, tokens, section grounds and contrast on black, links, focus, reduced motion, both animations and overflow at desktop, tablet and phone widths, and saves screenshots to `dist/screenshots/`. All checks must pass.
4. `python3 scripts/build.py package` writes `dist/growth-lab-site.zip` for Vercel.
