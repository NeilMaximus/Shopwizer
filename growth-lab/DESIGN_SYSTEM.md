# Growth Lab website design system

Version 2.3, 14 October 2026. Owner: Neil Botha.

These rules govern every page of the Growth Lab website, starting with Make Your Martech Pay. They are durable: follow them by default in every new page, edit and review. Neil requested and approved the changes recorded here. Change a rule only when he asks for it, and record the change in the change log at the end.

Values live in `tokens/tokens.css` (with a JSON copy in `tokens/tokens.json`). Never hard code a colour, font or radius in a page. Add a token instead.

## 1. Rules that supersede earlier ones

Version 2 replaces the earlier website styling, which came from the Life Insurer Lens page and the presentation system. Version 2.1 then corrects 2.0: the four stage section stays black. For the website, these older rules no longer apply:

| Earlier rule | Now |
| --- | --- |
| Instrument Sans for reading | Geist Sans (Google Fonts family name `Geist`) for everything |
| Martian Mono for labels, eyebrows, numbering and navigation | No monospace face anywhere. Labels, numbering and navigation are Geist Sans |
| Uppercase, widely tracked small labels | Sentence case, restrained tracking (0 to minus 0.005em) |
| Black header bar with a typed "Growth Lab" lockup | White header with the real Growth Lab vector logo |
| Off white canvas `#F2F2F0` | White page and hero `#FFFFFF`, with opaque very light grey `#F5F5F5` for supporting sections, boxes and panels |
| Black bands throughout | One deliberate black section, the four stages, on `#111111`. Version 2.0's "make the whole page white" is withdrawn |
| Dotted margin marks | Retired on the website |
| Coral `#FF5F57` | Brand coral is `#FF4E4E`. `#FF5F57` is only the window control red of the live site's OS chrome and is not a brand colour |

The presentation system for decks keeps its own rules. This document covers the website.

## 2. Principles

1. Concise copy. Every word earns its place. Do not pad, add slogans or invent claims.
2. A white hero and page with generous space and a clear hierarchy, inspired by the restraint of x.ai/bot, plus one deliberate black section for the four stages. Draw inspiration only. Never copy x.ai's layout, its X VF typeface or its assets.
3. One bold device per section: the value cube in the hero, the line of stage nodes, the MartechMap beside the benchmark, the rune above the footer. Everything around them stays quiet.
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
| Section heading (H2, white sections) | 30 to 40 px | 600 | minus 0.02em | Ink, `text-wrap: balance` |
| Workshop name (H3) | 22 to 26 px | 600 | minus 0.02em | Ink |
| Person name (H3) | 18 px | 600 | minus 0.01em | Ink, role below in ink 3 |
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
| `--gl-black` | `#111111` | Ground of the black four stage section |
| `--gl-on-black` | `#D4D4D4` | Body text on black |
| `--gl-on-black-2` | `#A3A3A3` | Numbering on black |
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
| White on black (`#111111`) | 18.9 | All text, taglines |
| On black (`#D4D4D4`) on black | 12.7 | Body text |
| On black 2 (`#A3A3A3`) on black | 7.5 | Numbering, small text |
| Coral on black | 5.8 | Stage headings, any size |
| Purple on black | 4.4 | Icon tiles, connector lines and arrows |
| Purple soft on black | 13.2 | Focus ring inside the black section |

## 5. Surfaces and layout

**Section grounds (fixed rule, Neil, 14 October 2026):**

| Section | Ground |
| --- | --- |
| Header | White |
| Hero ("Make your martech investment pay.") | White. The value cube sits on a light grey panel inside it |
| Four stages (Diagnose, Prioritise, Unlock, Optimise) | **Black `#111111`, full width.** Purple icon tiles and connecting arrows, coral headings, white semibold taglines, light grey body text, numbers in `--gl-on-black-2`. All Geist Sans |
| Rune band | White, with the faint grey rune cropped by the hairline |
| Footer | White |
| Evidence, workshops and the audit action (after the stages) | White, separated by hairlines inside the content width. No cards, tiles or grey panels. See section 11 |
| Future supporting sections | White, or light grey `--gl-panel` sections, boxes and panels |

- Never turn the four stage section white or light grey, and never restore Martian Mono or uppercase mono labels in it.
- Light grey is for supporting sections, boxes and panels only. It never replaces the black stage section.
- Do not add other black or coloured bands without Neil's approval.

- Panels are solid `--gl-panel` with a 28 px radius (`--gl-radius-panel`). Never translucent.
- Content width 1200 px with a fluid gutter of 20 to 48 px. Sections breathe: 72 to 140 px between them (`--gl-section`).
- Apart from the black stage section, separate sections with space and hairlines (`--gl-line`).
- Radii: panels 28 px, stage nodes and portraits 14 px, framed images 10 px, buttons fully rounded.
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
- They sit on the black four stage section. Stages are joined by a 1.5 px purple line ending in a chevron. On screens under 1000 px the line runs vertically.
- Current icons: magnifier with a falling line (Diagnose), scales (Prioritise), open padlock (Unlock), rising bars with an arrow (Optimise).

## 10. Components

- **Header:** white, logo left, stage links and a dark "Book an audit" pill right that jumps to the audit section. Stage links hide under 760 px. The pill stays.
- **Buttons:** dark pill (`--gl-ink` with white text) only for the one main action, "Book an audit". Quiet pill (white, hairline border) for secondary actions such as Talk to us and Copy. Minimum height 44 px for main actions, and every link, button and summary at least 24 px each way.
- **Four stage section:** black `#111111`, full width, `--gl-section` padding top and bottom. Number (Geist 500, `--gl-on-black-2`), coral heading, white tagline (Geist 600, two sentence taglines break between sentences), body in `--gl-on-black`.
- **Footer:** white, under the rune band. Logo, the four section links, a quiet "Talk to us" email pill, the address as selectable text with a Copy button, then a hairline and the legal line: copyright, Privacy, Website terms.
- **Email actions in the private Claude preview:** the artifact viewer can show a blank page after an email link, so the preview build turns "Book an audit" and "Talk to us" into buttons that copy the address ("Email copied", or the address is selected if the clipboard is refused). Beside "Book an audit" the address shows as selectable text. Addresses on the legal pages are plain text. Never show a booking confirmation. The site and the browser files keep working email links. `scripts/build.py` makes these swaps and fails if they stop matching; never remove the address shown as text.
- **Draft legal pages:** generated from `legal/*.md`, marked "Draft for review. Not approved and not yet in force", `noindex`, with CONFIRM placeholders highlighted.

## 11. Evidence, workshops and the audit action

Three white sections sit between the black stages and the rune band, in this order. Each has one job and one H2, with no eyebrow, tiles, counters, icons or scroll effects. Hairlines inside the content width separate them. Every figure, link and image is recorded in `SOURCES.md` with its as at date.

**Evidence (`#evidence`).** The benchmark number is the evidence. The map is supporting material.

- Desktop: copy on the left (about 40 percent), map on the right (about 60 percent), vertically centred. Under 1000 px: copy first, then the map.
- Heading "1,634 martech stacks benchmarked." Then "Growth Lab works with MartechTribe, drawing on martech research across industries since 2017." Write "since 2017", never a count of years that ages.
- One quiet line in ink 3 for the secondary figures: "MartechTribe indexes 1,345 features across 49 martech categories and has advised 200+ global brands." Then a small source line linking https://martechtribe.com/ with the as at date.
- The MartechMap is vendor artwork. Show it whole at 16:9 with its chiefmartec and MartechTribe credit visible: never crop, recolour or stretch it. Hairline ring, 10 px radius (`--gl-radius-image`). Caption "MartechMap 2026 · chiefmartec and MartechTribe · 15,505 products" with a "View the full map" link to the 4096 px file.
- Never attach the 49 categories to the map, and never present the map or MartechTribe's figures as Growth Lab audit counts. No stat tiles, and no superlatives such as "the world's richest".

**Workshops (`#workshops`).** Heading "Two workshops with MartechTribe."

- Two equal open columns split by one vertical hairline, stacked with a horizontal hairline at 760 px and under. No cards, panels, icons or images.
- Each column shows the name, one outcome line and the duration. Everything else sits in a native `details` element, "What you leave with", closed by default, using the browser's own marker in purple strong.
- The Apex Martech Matrix is linked, never embedded: a short text explanation, then the link "See the retail benchmark example" labelled "Retail industry example, published by MartechTribe". It was developed by MartechTribe with the CMO Council and is not a Growth Lab client result. Do not scrape, redraw or invent data for it.

**Audit action (`#audit`).** Heading "Start with an audit." Then the approved Diagnose line: "We examine your martech, data and customer journeys to find where value is being lost."

- Neil Botha and Frans Riemersma get identical treatment: 96 px black and white portraits with a 14 px radius and hairline ring, then the name, their own separate role and one short credibility line.
- Desktop: profiles on the right of the heading and button. Under 1000 px: heading, profiles, then the button. At 380 px and under, each portrait sits above its text.
- Never say or imply that both people deliver every audit, that the relationship is exclusive, that a booking is confirmed, or any price, fee or free offer.
- One action across the page, "Book an audit". In the header it jumps to `#audit`. In the section it opens an email to hello@growthlab.co.za with the subject "Audit enquiry", above the line "Email us to agree the scope and next steps." The footer "Talk to us" is a quiet pill so it does not compete.

## 12. Motion

- **Cube build:** on load, after 0.5 s, the cube grows from the core along one axis at a time (0.72 s each, cubic ease in and out), lighting each outcome label and arrow as its axis grows. It then rests.
- **Rune breathing:** the two chevrons drift apart diagonally by 1.3 units, about 4 percent of the rune's width (31 px at full size, 13 px on a phone), and back, 8 s each way (`--gl-rune-cycle`). Smaller drifts could not be seen on a phone. It runs by default and pauses only while the band is known to be off screen. Its rest position is the true logo geometry, and the 5 percent headroom above the rune keeps the drift uncropped at the top.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, the cube shows its finished state at once and the rune stays still. Smooth scrolling is off.
- No other animation without Neil's approval. Never spin, bounce or loop attention grabbing effects.

## 13. Accessibility

- Contrast as in section 4. Text below large size uses ink, ink 2, ink 3 or purple strong only.
- Visible focus on every interactive element: 2 px `--gl-purple-strong` outline, 3 px offset. Inside the black section the ring switches to `--gl-purple-soft`.
- A skip link, landmarks (header, main, footer), one H1 per page, decorative SVG marked `aria-hidden`.
- Copy actions announce their result through a live region.
- Expandable detail uses native `details` and `summary`, reachable and operable with the keyboard (Enter and Space), with the same focus ring.
- Portraits next to a visible name use empty alt text. The map has descriptive alt text. Links that open a new tab say so to screen readers.
- Run `node tests/verify.cjs` before sharing or deploying.

## 14. Copy

- UK English. Concise. Use Neil's approved copy as written.
- No em dashes or hyphenated constructions where a comma or a plain phrase works.
- Contact is hello@growthlab.co.za, shown as text as well as a link.

## 15. Legal and footer honesty

- Never invent legal entity details, registration numbers, addresses, compliance claims or policies.
- Privacy and Website terms stay labelled as drafts ("Drafts, pending approval") until approved versions replace them. See `PRELAUNCH.md`.
- No cookie banner unless the site starts setting cookies or loading tracking. Today it sets none and loads nothing from third parties.

## 16. Where things live

| Path | What |
| --- | --- |
| `tokens/tokens.css`, `tokens/tokens.json` | Design tokens, the source of truth |
| `site/` | The deployable site (Vercel output directory) |
| `site/assets/fonts/geist/` | Geist woff2 and its OFL licence (fallback metrics in `scripts/geist-metrics.json`) |
| `site/assets/brand/` | Logo, rune and mark SVGs |
| `site/assets/media/` | MartechMap 2026 (800, 1600 and 4096 px) and the two portraits (192 px) |
| `SOURCES.md` | Every figure, link and image in the white sections, with sources and the as at date |
| `legal/` | Draft privacy notice and website terms (Markdown sources) |
| `scripts/` | Build, font, rune and cube generators |
| `tests/verify.cjs` | Automated checks and screenshots |

## Change log

- **2.3, 14 October 2026.** Three white sections after the black stages: the benchmark evidence with the MartechMap (40 / 60 split), two workshops with MartechTribe in open columns with native details, and the audit action with Neil and Frans at identical size. One action, "Book an audit", in the header and the audit section; the footer "Talk to us" goes quiet. Apex Martech Matrix linked as a retail example, not embedded. New `SOURCES.md`.
- **2.2, 14 October 2026.** Rune drift raised to 1.3 units over 8 s each way so it can be seen on a phone, and it now runs by default. Private preview: no email links (the viewer could go blank), "Talk to us" copies the address. New browser files in `dist/browser/` open straight from a folder.
- **2.1, 14 October 2026.** Neil's correction: the four stage section is black `#111111` again, as in the original design, with purple tiles and arrows, coral headings, white taglines and light grey body text, all in Geist. The hero stays white. Light grey is for supporting sections and panels and never replaces the black section. Withdraws 2.0's instruction to remove all black bands.
- **2.0, 14 October 2026.** Geist Sans only, no monospace. White base with opaque grey panels. Verified brand colours (purple `#7761FF`, coral `#FF4E4E`, amber `#FEBC2E`). Real vector logo. Rune band above a new footer. Draft legal pages.
- **1.0, 13 October 2026.** First Make Your Martech Pay page in the Life Insurer Lens style (Instrument Sans, Martian Mono, black bars). Superseded.
