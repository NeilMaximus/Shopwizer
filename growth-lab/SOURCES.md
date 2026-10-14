# Sources and figures

Every figure, link and image in the white sections of Make Your Martech Pay (evidence, workshops and getting going) and on the contact view, where it comes from, and when it was checked. When a figure changes, update the page, this file and the as at date on the page together.

**As at 14 October 2026.**

## Figures

These are MartechTribe's own figures. They describe MartechTribe's research and the MartechMap, not Growth Lab audits.

| On the page | Where | Source | Notes |
| --- | --- | --- | --- |
| MartechTribe has benchmarked 1,634 martech stacks. | Main view, the one quiet proof point | https://martechtribe.com/, checked 14 October 2026 | Attributed to MartechTribe in the sentence itself |
| Martech research across industries since 2017 | Main view, the sentence under the heading | https://martechtribe.com/, checked 14 October 2026 | The site also says 9 years. Use "since 2017" so the page does not age |
| MartechMap 2026 by chiefmartec and MartechTribe: 15,505 solutions | Sources note | https://martechtribe.com/ (15,505 solutions), checked 14 October 2026, and State of Martech 2026, Brinker and Riemersma | The figure is 15,505. Never 1,500,505, which was a typo in a draft brief |
| 1,345 features indexed daily across 49 martech categories | Sources note | https://martechtribe.com/ (1,345 features across 49 categories), checked 14 October 2026 | "Indexed daily" is the wording of Neil's brief of 14 October 2026; confirm it with MartechTribe before launch. Never attached to the map: equivalence with the map's categories is not verified |
| Advised 200+ global brands | Sources note | https://martechtribe.com/ (200+ brands), checked 14 October 2026 | "Advised" is the wording of Neil's approved copy, from the Life Insurer Lens v10 |

The Sources note on the page reads: "MartechMap 2026 by chiefmartec and MartechTribe: 15,505 solutions. MartechTribe also indexes 1,345 features daily across 49 martech categories and has advised 200+ global brands. Figures from martechtribe.com, as at 14 October 2026." The link opens martechtribe.com in a new tab.

## Wording to confirm

- **"Put independent research to work."** Neil's heading of 14 October 2026. "Independent" describes MartechTribe's research. Confirm with Frans Riemersma that MartechTribe is comfortable with the word before launch (see `PRELAUNCH.md`).
- **"Indexed daily"**, as above.

## Relationship wording

Neil's direction of 14 October 2026: Growth Lab is working with MartechTribe and Frans Riemersma, and the page shows both workshops and both portraits. This takes precedence over older planning notes.

Never claim that Frans attends every Growth Lab audit, an exclusive partnership, pricing, fees, a free offer or a booked appointment.

## Workshops

Source for both: https://martechtribe.com/workshops, checked 14 October 2026, which confirms both formats and their outcomes, and the copy Neil supplied from the Life Insurer Lens v10.

| Workshop | Outcome line and duration | The value you get |
| --- | --- | --- |
| Value Engineering Workshop | Turn marketing initiatives into boardroom business cases using your own data. Three mornings | A quantified view of business value. An executive ready business case. Ranked investment priorities. A framework your team can reuse |
| Technology Strategy Workshop | Benchmark your stack against high performing peers and leave with technology priorities and an investment roadmap. Three mornings or one full day | A benchmark against high performing peers. Prioritised technology investments. An investment roadmap. Executive recommendations |

Version 2.4 dropped the method sentence (the Apex Martech Score, GrowTechHQ and MartechTribe's benchmark research) from the Technology Strategy detail so the outcomes read as crisp bullets.

## The Apex Martech Matrix

Not on the page since version 2.4 (Neil's refinement removed the retail example and its caption). Kept here for reference:

- Source: https://martechtribe.com/blog/there-is-no-best-in-class-technology-its-official
- MartechTribe's caption there: "The Apex Martech Matrix, developed by MartechTribe in collaboration with the CMO Council. Retail Industry example."
- It is a retail example, not a Growth Lab client result. If it ever returns, link it with that label; never scrape, redraw or invent data for it.

## People

| Person | Role | Line on the page | Source |
| --- | --- | --- | --- |
| Neil Botha | Founder and Strategy Director, Growth Lab | More than 20 years turning customer strategy, data and martech into measurable growth for South African financial services. | Life Insurer Lens v10, About the authors |
| Frans Riemersma | Founder, MartechTribe | Produces the MartechMap and writes the annual State of Martech report with Scott Brinker. More than 30 years in consulting. | Life Insurer Lens v10, About the authors |

## Contact details

| Detail | Value | Source |
| --- | --- | --- |
| Email | hello@growthlab.co.za | Growth Lab's published address. The contact form sends only to it |
| Phone | +27 84 504 0505, linked as `tel:+27845040505` | Neil's number, confirmed by him on 14 October 2026. Set in `config/contact.json`; `scripts/build.py` writes it into the contact view. Never invent a number or copy another site's, including Isoflow's |

## Images

All taken from the media of the private Life Insurer Lens v10 artifact (https://claude.ai/artifact/22EuUHCRLjnKa65wqVzzKz) on 14 October 2026. Scaled only, never cropped or recoloured.

| File in `site/assets/media/` | Pixels | From |
| --- | --- | --- |
| `martechmap-2026.jpg` | 1600 × 900 | Lens `media/martechmap-2026.jpg`, as published. MartechMap 2026 by chiefmartec and MartechTribe, with their credits in the artwork |
| `martechmap-2026-800.jpg` | 800 × 450 | Scaled from the 1600 px file for phones and standard screens |
| `neil-botha.jpg` | 192 × 192 | Lens `media/neil.jpg` (200 px), scaled |
| `frans-riemersma.jpg` | 192 × 192 | Lens `media/frans.jpg` (320 px), scaled |

The 4096 px full map was removed in version 2.4 with the "View the full map" link.

## Not used, and why

- "The world's richest martech benchmark dataset across every industry": no source ranks the dataset against others or shows coverage of every industry.
- The Lens v10 heading "Martech audits in numbers": it presented MartechTribe's figures as audit counts.
- Five large statistic tiles, and the "MartechTribe indexes..." paragraph in the main view: client benefits lead, and the figures support them from the Sources note.
- Pricing from older plans, testimonials and client logos: not approved for this page.
