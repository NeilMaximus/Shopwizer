# Growth Lab website design system

Version 2.0, 14 October 2026. Owner: Neil Botha.

These rules govern every page of the Growth Lab website, starting with Make Your Martech Pay. They are durable: follow them by default in every new page, edit and review. Neil requested and approved the changes recorded here. Change a rule only when he asks for it, and record the change in the change log at the end.

Values live in `tokens/tokens.css` (with a JSON copy in `tokens/tokens.json`). Never hard code a colour, font or radius in a page. Add a token instead.

## 1. Rules that supersede earlier ones

Version 2.0 replaces the earlier website styling, which came from the Life Insurer Lens page and the presentation system. For the website, these older rules no longer apply:

| Earlier rule | Now |
| --- | --- |
| Instrument Sans for reading | Geist Sans (Google Fonts family name `Geist`) for everything |
| Martian Mono for labels, eyebrows, numbering and navigation | No monospace face anywhere. Labels, numbering and navigation are Geist Sans |
| Uppercase, widely tracked small labels | Sentence case, restrained tracking (0 to minus 0.005em) |
| Black header bar with a typed "Growth Lab" lockup | White header with the real Growth Lab vector logo |
| Off white canvas `#F2F2F0` | White page `#FFFFFF` with opaque very light grey panels `#F5F5F5` |
| Black section bands | White sections separated by hairlines and space |
| Dotted margin marks | Retired on the website |
| Coral `#FF5F57` | Brand coral is `#FF4E4E`. `#FF5F57` is only the window control red of the live site's OS chrome and is not a brand colour |

The presentation system for decks keeps its own rules. This document covers the website.

## 2. Principles

1. Concise copy. Every word earns its place. Do not pad, add slogans or invent claims.
2. A white page with generous space and a clear hierarchy, inspired by the restraint of x.ai/bot. Draw inspiration only. Never copy its layout, its X VF typeface or its assets.
3. One bold device per section. The value cube in the hero, the line of stage nodes, the rune above the footer. Everything around them stays quiet.
4. Solid surfaces only. Panels are opaque. No translucency, frosted glass, blur, glows or heavy shadows.
5. Motion with a purpose, slow and controlled. Never spinning, bouncing or decorative noise.

## 3. Typography

**Typeface: Geist Sans only.** Self hosted from Vercel's official `geist` npm package, licensed under the SIL Open Font License 1.1 (`site/assets/fonts/geist/OFL.txt`).

- File: one variable woff2, `Geist-Variable-Latin.woff2` (about 24 KB). It is limited to weights 400 to 700 and the Latin range. Rebuild it with `scripts/build_font.py` if more glyphs or weights are ever needed.
- Loading: `font-display: swap`, preloaded in the page head. A size matched local fallback (`Geist Fallback`, built on Arial with `size-adjust: 105.46%`) keeps the layout steady while the font loads.
- Stack: `var(--gl-font)`, which is Geist, then Geist Fallback, then the system sans stack.
- **No monospace anywhere in website UI.** That includes headlines, body, navigation, small labels, buttons, the footer and numbering such as 01 to 04. Do not use Martian Mono, Geist Mono or any terminal styling.

| Role | Size | Weight | Tracking | Notes |
| --- | --- | --- | --- | --- |
| Display (H1) | sized to its column, about 60 px on desktop, 34 px minimum | 600 | minus 0.035em | Two lines on desktop, `text-wrap: balance` |
| Stage name (H2) | 28 to 34 px | 600 | minus 0.02em | Brand coral |
| Lead | 18 to 20 px | 400 | 0 | `--gl-ink-2` |
| Tagline | 18 px | 600 | minus 0.01em | Two sentences break between sentences |
| Body | 16 to 17 px | 400 | 0 | Line height 1.6 |
| Navigation, buttons | 15 px | 500 | minus 0.005em | Sentence case |
| Numbering (01 to 04) | 14 px | 500 | 0 | `font-variant-numeric: tabular-nums`, `--gl-ink-3` |
| Small print | 13 px | 400 | 0 | Footer legal line |

## 4. Colour

Brand accents are verified from the live growthlab.co.za stylesheet (`--acc-purple`, `--acc-coral`, `--acc-amber`).

| Token | Value | Use |
| --- | --- | --- |
| `--gl-purple` | `#7761FF` | Primary accent. Cube faces, stage nodes, connectors, large display |
| `--gl-coral` | `#FF4E4E` | Brand coral. Large display text (stage names) and graphics only |
| `--gl-amber` | `#FEBC2E` | Very sparingly, only where it has a job. Never as text on white. Not used on Make Your Martech Pay |
| `--gl-purple-strong` | `#644CF0` | Derived shade for purple text, links and the focus ring |
| `--gl-purple-soft` | `#D9D3FF` | Derived tint. Cube top face, text selection |
| `--gl-white` | `#FFFFFF` | Page background |
| `--gl-panel` | `#F5F5F5` | Opaque very light grey panel |
| `--gl-panel-strong` | `#EBEBEB` | Hover on panels and quiet buttons |
| `--gl-line` | `#E5E5E5` | Hairlines and borders |
| `--gl-ink` | `#111111` | Primary text and the logo |
| `--gl-ink-2` | `#404040` | Secondary text |
| `--gl-ink-3` | `#666666` | Numbering, meta, small print |
| `--gl-rune-top`, `--gl-rune-bottom` | `#F1F1F1`, `#E3E3E3` | The rune's faint gradient |
| `--gl-core-top`, `-left`, `-right` | `#3A3A38`, `#222221`, `#111111` | The cube's black core |
| `--gl-amber-tint` | `#FFF1CC` | Only for CONFIRM placeholders in draft documents |

Measured contrast (WCAG 2.2):

| Pair | Ratio | Allowed for |
| --- | --- | --- |
| Ink on white / on panel | 18.9 / 17.3 | All text |
| Ink 2 on white / on panel | 10.4 / 9.5 | All text |
| Ink 3 on white / on panel | 5.7 / 5.3 | All text |
| Purple strong on white / on panel | 5.5 / 5.0 | All text, links, focus ring |
| Purple on white | 4.25 | Large text and graphics only |
| Coral on white | 3.25 | Large text only: 24 px and up, or 19 px bold and up |
| Coral on panel | 2.99 | **Not for text.** Keep coral text on white |
| White on purple | 4.25 | Icons and large text |
| Amber on white | 1.69 | **Never text.** Small graphic accents only |

## 5. Surfaces and layout

- Page background white. Panels are solid `--gl-panel` with a 28 px radius (`--gl-radius-panel`). Never translucent.
- Content width 1200 px with a fluid gutter of 20 to 48 px. Sections breathe: 72 to 140 px between them (`--gl-section`).
- Separate sections with hairlines (`--gl-line`) and space, not with coloured bands.
- Radii: panels 28 px, stage nodes 14 px, buttons fully rounded.
- Every layout works from 320 px wide with no horizontal scroll.

## 6. Logo

- Use only the verified vector logo: `site/assets/brand/growthlab-logo.svg`. It is the inline SVG from the live growthlab.co.za header (`role="img"`, `aria-label="growthlab"`, `viewBox="0 0 297 70"`), confirmed by Neil on 14 October 2026 and identical to the copy in the GrowthLab OS prototype.
- Its four paths are, in order: the rune's two chevrons, the rounded container, and the wordmark.
- Never retype the name as a placeholder, redraw, stretch or recolour it beyond ink on light grounds (and white on dark grounds if one is ever needed). Keep the 297 by 70 proportions.
- Header height 30 px on desktop and tablet, 26 px on phones. Keep clear space of at least half the logo height around it.
- Inline the SVG in pages so it inherits `currentColor`. `growthlab-mark.svg` (paths 1 to 3) is the favicon.

## 7. Rune

- The rune is the pair of offset, opposing angular chevrons in the logo: paths 1 and 2, unchanged. File: `site/assets/brand/growthlab-rune.svg`, viewBox `21.313 12.871 32.333 36.756` (width to height 0.88). `scripts/extract_rune.py` derives it from the logo.
- Website use: one oversized, faint rune in its own band above the footer, centred, with the bottom 32 percent cropped by the hairline that starts the white footer. The band holds no text or links.
- Treatment: the `--gl-rune-top` to `--gl-rune-bottom` gradient on white. No outlines, no colour.
- Never stretch it, rotate it, change its geometry or use it as a bullet or icon.

## 8. The value cube

- The hero device for "Win more customers. Keep them longer. Grow revenue more efficiently." A black core (today's results) sits inside a purple cube (the value Growth Lab unlocks). Each outcome is one axis: customers up, lifetime to the lower left, revenue to the lower right.
- Geometry comes from `scripts/gen_cube_svg.py`. The static SVG in the page is the finished cube, so the page reads correctly without JavaScript.
- It sits on a light grey panel. Labels are Geist 600, scaled with the panel width.

## 9. Icons and stage nodes

- Line icons on a 1200 unit grid with a 48 unit round stroke (bars 64), in white inside 64 px purple nodes (56 px on smaller screens) with a 14 px radius.
- Stages are joined by a 1.5 px purple line ending in a chevron. On screens under 1000 px the line runs vertically.
- Current icons: magnifier with a falling line (Diagnose), scales (Prioritise), open padlock (Unlock), rising bars with an arrow (Optimise).

## 10. Components

- **Header:** white, logo left, stage links and a dark "Talk to us" pill right. Stage links hide under 760 px. The pill stays.
- **Buttons:** dark pill (`--gl-ink` with white text) for the main action. Quiet pill (white, hairline border) for secondary actions such as Copy. Minimum height 44 px for main actions.
- **Footer:** white, under the rune band. Logo, the four section links, the "Talk to us" email button, the address as selectable text with a Copy button, then a hairline and the legal line: copyright, Privacy, Website terms.
- **Draft legal pages:** generated from `legal/*.md`, marked "Draft for review. Not approved and not yet in force", `noindex`, with CONFIRM placeholders highlighted.

## 11. Motion

- **Cube build:** on load, after 0.5 s, the cube grows from the core along one axis at a time (0.72 s each, cubic ease in and out), lighting each outcome label and arrow as its axis grows. It then rests.
- **Rune breathing:** the two chevrons drift apart diagonally by 0.75 units (about 19 px at full size) and back over 14 s, alternating, only while the band is on screen. Its rest position is the true logo geometry.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, the cube shows its finished state at once and the rune stays still. Smooth scrolling is off.
- No other animation without Neil's approval. Never spin, bounce or loop attention grabbing effects.

## 12. Accessibility

- Contrast as in section 4. Text below large size uses ink, ink 2, ink 3 or purple strong only.
- Visible focus on every interactive element: 2 px `--gl-purple-strong` outline, 3 px offset.
- A skip link, landmarks (header, main, footer), one H1 per page, decorative SVG marked `aria-hidden`.
- The copy action announces its result through a live region.
- Run `node tests/verify.cjs` before sharing or deploying.

## 13. Copy

- UK English. Concise. Use Neil's approved copy as written.
- No em dashes or hyphenated constructions where a comma or a plain phrase works.
- Contact is hello@growthlab.co.za, shown as text as well as a link.

## 14. Legal and footer honesty

- Never invent legal entity details, registration numbers, addresses, compliance claims or policies.
- Privacy and Website terms stay labelled as drafts ("Drafts, pending approval") until approved versions replace them. See `PRELAUNCH.md`.
- No cookie banner unless the site starts setting cookies or loading tracking. Today it sets none and loads nothing from third parties.

## 15. Where things live

| Path | What |
| --- | --- |
| `tokens/tokens.css`, `tokens/tokens.json` | Design tokens, the source of truth |
| `site/` | The deployable site (Vercel output directory) |
| `site/assets/fonts/geist/` | Geist woff2 and its OFL licence (fallback metrics in `scripts/geist-metrics.json`) |
| `site/assets/brand/` | Logo, rune and mark SVGs |
| `legal/` | Draft privacy notice and website terms (Markdown sources) |
| `scripts/` | Build, font, rune and cube generators |
| `tests/verify.cjs` | Automated checks and screenshots |

## Change log

- **2.0, 14 October 2026.** Geist Sans only, no monospace. White base with opaque grey panels. Verified brand colours (purple `#7761FF`, coral `#FF4E4E`, amber `#FEBC2E`). Real vector logo. Rune band above a new footer. Draft legal pages.
- **1.0, 13 October 2026.** First Make Your Martech Pay page in the Life Insurer Lens style (Instrument Sans, Martian Mono, black bars). Superseded.
