# PH Disaster History: Progress Log

Build follows the Build Order in `PLAN.md`. Each step: `npm run build` passes, one git commit ("Step N: ..."), one entry here.

## Needs Dewdew
- **Vercel deploy (Steps 1 and 3 say "deploy" / "ship it").** Skipped on purpose: the project rule is no deploys unless you ask. When you're ready: push to GitHub, then import the repo on vercel.com (Framework: Next.js, no settings to change). The site is a static export, so the free Hobby plan is enough.
- **Push to GitHub.** Not done (your rule). The repo is local with one commit per step on `main`.
- **30-second demo video.** Needs you (screen recording). Suggested flow: landing → Linog Map heatmap → Strongest 20 click → Bagyo search "yolanda" → storm page → My Place → Leyte.
- **"Problem I solved" note.** Drafted in `docs/problem-i-solved.md`; rewrite it in your own words.
- **Map pages' Lighthouse score (optional follow-up).** Mobile Lighthouse: landing 92, Linog Map 52, Bagyo Archive 57, storm page 64 (accessibility 96–100 everywhere). The slow part is that the largest thing on screen is an OpenStreetMap tile, which only loads after Leaflet's JavaScript runs. Fix idea: show a small static map image in the map box until Leaflet is ready. Not done yet.
- **Optional data check (Step 9), not blocking.** 3 retired storms list more PH deaths than Wikipedia's all-areas total, so I left them out of the curated deadliest list: Ruby/Hagupit 2014 (24 vs 18), Nika/Toraji 2024 (17 vs 4), Crising/Wipha 2025 (36 vs 20). If you find the right NDRRMC number, add a `ph_deaths` + `ph_source_url` row for it in `data/overrides.csv`.
- **Ulysses (Vamco) 2020 death count.** Sources disagree: the retired-names table says 51 (PAGASA report), the Vamco article cites NDRRMC 98 (Jan 13, 2021). I used **98 (NDRRMC)**. Change it in `data/overrides.csv` if you prefer the other.

## How to run it
```bash
npm install
npm run dev
```
Open http://localhost:3000. For the production build: `npm run build`, then `npm run preview` and open http://localhost:3000 (or the port it prints).

## Log

### Step 1: Setup (2026-10-28)
**Done**
- Next.js 16.4 (App Router, TypeScript) + Tailwind CSS 4, set to static export (`output: "export"` in `next.config.ts`, builds to `out/`).
- Leaflet + react-leaflet base map (`src/components/map/BaseMap.tsx`), loaded client-only with `next/dynamic` + `ssr: false`, canvas renderer on.
- Site header with nav (Linog Map, Bagyo Archive, My Place, Sources), dark/light toggle (remembers your choice, defaults to your system setting), footer with sources on every page.
- Dark mode darkens the OpenStreetMap tiles with a CSS filter.
- `.gitignore` keeps `data/raw/` (big downloads) out of git.
- Locked your answers into `CLAUDE.md` and `PLAN.md` (typhoons from 1945, PAGASA scale, quake box to 128°E, curated deadliest list, Metro Manila merged, GitHub URL as Wikipedia contact).

**How to test**
- `npm run dev`, open http://localhost:3000: you should see the two cards and a map of the Philippines.
- Click the ☾ / ☀︎ button: the whole page and the map tiles switch theme, and it stays after a reload.

### Step 2: Earthquake scripts (2026-10-28)
**Done**
- `scripts/fetch-earthquakes.ts`: downloads USGS quakes M4.5+ one year at a time (1900 → now) into `data/raw/quakes/` (gitignored). Past years are cached, the current year always re-downloads. `--force` re-downloads all. Uses `endtime = Jan 1 of next year` so quakes late on Dec 31 aren't lost (the plan's `endtime=YYYY-12-31` would cut most of Dec 31).
- `scripts/build-earthquakes.ts`: merges and de-duplicates, keeps `id, time, mag, depth, lat, lon, place`, rounds coords to 3 decimals. Writes `public/data/quakes.json` (compact rows) and `public/data/quakes-summary.json` (per year, per magnitude band, top 20 strongest).
- Shared helpers in `scripts/lib/` (polite fetch with retries, CSV, paths, size check). Data shapes in `src/lib/types.ts`.
- Result: **15,778 quakes** (M6+: 664, M7+: 86). `quakes.json` = 1.4 MB, summary = 7 KB (both under the 2 MB rule).
- Strongest: M8.3 1918 Celebes Sea, M8.1 1924 Mindanao, M8.0 1972 Mindanao, M7.9 1976 Moro Gulf.

**How to test**
- `npm run data:quakes` (takes ~2 min the first time, a few seconds after that because of the cache).
- Check the console summary and that `public/data/quakes.json` exists.

### Step 3: Linog Map MVP (2026-10-28)
**Done**
- `/linog` page: all 15,778 quakes on the map as canvas circle markers, sized and colored by magnitude, with a legend.
- Filters: magnitude range (M4.5–M9.0), year range (1900–now), depth bands (shallow 0–70 km, intermediate 70–300 km, deep 300+ km), reset button, and a live "Showing X of Y quakes" count.
- Click a quake: popup with date/time (PH time), magnitude, depth, place and a link to the USGS event page.
- Mobile: map is full width, filters open in a bottom sheet ("Filters" button on the map). Desktop: filters in a left sidebar.
- Performance: markers are created once and cached; a filter change only adds/removes the markers that changed (slider drag ~20–60 ms instead of ~600 ms for a full redraw). Dark mode restyles markers instead of recreating them.
- Colors: one orange ramp (light = weak, dark = strong; flipped in dark mode so strong quakes stand out), checked with a color validator for contrast and single hue.
- Note on the page: pre-1973 catalog only lists bigger quakes; USGS vs PHIVOLCS magnitudes can differ.

**How to test**
- `npm run dev`, open http://localhost:3000/linog.
- Drag the magnitude "From" slider to 6.0: the count drops to 664 and only big quakes remain.
- Click any circle: a popup shows the date in PHT and a USGS link.
- Shrink the browser to phone width: the "Filters" button opens the bottom sheet.

### Step 4: Linog extras + province tagging (2026-10-28)
**Done**
- `scripts/build-provinces.ts`: downloads PSGC province boundaries (faeldon/philippines-json-maps, MIT), merges the 4 NCR districts into **Metro Manila** and the City of Isabela into **Basilan** (84 units: 82 provinces + Metro Manila + BARMM Special Geographic Area). Writes `public/data/provinces.json` (simplified with mapshaper, 323 KB), `public/data/provinces-index.json` (names, regions, centers) and a more detailed copy in `data/raw/` for the scripts.
- `scripts/lib/provinces.ts`: point-in-province lookup (turf) + fast nearest-province search.
- `build-earthquakes.ts` now tags every quake: 2,643 on land, 10,879 offshore near a province (≤ 100 km), 2,256 Outside PH. Spot-checked: 2013 Bohol M7.1 → Bohol, 1990 Luzon M7.7 → Nueva Ecija, 2019 M6.8 → Davao del Sur, 2023 M7.6 → offshore Surigao del Sur, all 46 Malaysia quakes → Outside PH. Top provinces: Davao Oriental, Surigao del Sur, Surigao del Norte (Philippine Trench).
- `/linog` extras: Dots/Heatmap toggle (leaflet.heat, same orange ramp), side panel tabs with charts (quakes per year, top 10 provinces, by magnitude; each with a "Show numbers" table) and the Strongest 20 list (click one → map flies there and opens its popup). Popups now show the province ("Bohol" / "Offshore, near X" / "Outside PH").
- Charts update with the filters.
- New npm script: `npm run data:provinces` (run before `data:quakes`).

**How to test**
- Open http://localhost:3000/linog, click **Heatmap**: bright spots east of Mindanao and around Luzon.
- Open the **Strongest 20** tab, click "M8.3 Aug 15, 1918": the map flies to the Celebes Sea and the popup says "Offshore, near Sultan Kudarat".
- Set years to 2000–2026 in the filters: the charts redraw for that range.

### Step 5: IBTrACS script → typhoon JSON (2026-10-28)
**Done**
- `scripts/fetch-ibtracs.ts`: downloads the IBTrACS Western Pacific CSV (115 MB) into `data/raw/ibtracs/` (gitignored); skips if the file is under 7 days old, `--force` to re-download.
- `scripts/lib/ibtracs.ts`: parses the CSV, keeps storms from **1945+** that entered the **real PAR polygon**, main + provisional tracks (no spurs). Wind = JMA 10-min wind, else JTWC 1-min × 0.88 (flagged "estimated"), in km/h rounded to 5. Parsed result is cached in `data/raw/ibtracs/par-storms.json`.
- `scripts/build-typhoons.ts`: writes `public/data/typhoons/index.json` (388 KB), one `{sid}.json` per storm (6-hourly track, largest 4 KB), and `tracks-{decade}.json` (simplified tracks for the list map, 20–77 KB each). It already knows how to join local names, damage, affected provinces, retired names and `overrides.csv` (applied last) for the later steps.
- PAGASA categories from the 10-min wind: TD ≤ 61, TS 62–88, STS 89–117, TY 118–184, STY ≥ 185 km/h.
- Result: **1,793 storms** (TD 114, TS 318, STS 269, TY 528, STY 298, unknown strength 266, mostly 1945–1980s storms with no wind in IBTrACS).
- Spot-checks: Haiyan 2013 230 km/h STY, Rai 2021 195 STY, Ketsana 2009 130 TY, Washi 2011 95 STS, Bopha 2012 185 STY, Goni 2020 220 STY, Thelma 1991 75 TS.
- New npm script: `npm run data:typhoons`.

**How to test**
- `npm run data:typhoons` → prints the storm count and category breakdown.
- Open `public/data/typhoons/2013306N07162.json` (Haiyan): peak 230 km/h, 38 track points.

### Step 6: Bagyo list + track map (2026-10-28)
**Done**
- `/bagyo` page: searchable list of all 1,793 storms (newest first, 60 at a time with "Show more"), each with category chip, dates (PHT), peak wind, deaths when known, and a "Details →" link.
- Filters: name search (searches all years, ignores the decade filter, also matches JTWC numbers like "30W" and years), decade (default: latest decade), year, peak strength chips (TD/TS/STS/TY/STY/Unknown). Province filter is wired in but only appears after Step 10 adds the data.
- Map: tracks of the filtered storms colored by strength along the track (same orange ramp, PAGASA scale), dashed PAR outline, legend. Tracks load from the small per-decade files only for the decades in view; more than 300 matching storms → the map asks you to narrow the filter instead of drawing them all (keeps phones smooth).
- Click a storm in the list or a track on the map: it's highlighted (thicker line with a casing) and the map zooms to it; track popups link to the storm page.
- Stats tab: storms per year (current filters) with a numbers table; "Deadliest in the Philippines" (curated only; fills in at Step 9).
- URL presets: `/bagyo?q=haiyan`, `/bagyo?decade=1990`, `/bagyo?province=bohol` (after Step 10).
- Mobile: map on top, filters in the bottom sheet, list below.

**How to test**
- Open http://localhost:3000/bagyo: 2020s storms are listed and drawn.
- Type "haiyan": 2 results (2013 STY 230 km/h, 2001 TY). Click the 2013 one: its track is highlighted.
- Pick "All years" in Decade: the map asks you to narrow down (1,793 storms > 300).

### Step 7: Wikipedia auto-fill (2026-10-28)
**Done**
- `scripts/fetch-wikipedia.ts` (MediaWiki API only, User-Agent with your GitHub URL, 1 s between requests, 20 pages per request, raw responses cached in `data/raw/wikipedia/`):
  - **Local names:** reads every "[YEAR] Pacific typhoon season" page 1990 → 2026, parses headings like `Typhoon Haiyan (Yolanda)`, and matches each to an IBTrACS storm by international name + season, then JTWC number (`Tropical Depression 30W (Wilma)`), then dates (only when exactly one unnamed storm fits). Local names are checked against that season's official PAGASA name table on the same page, so JTWC names like "Tropical Depression Jack" (1993) aren't mistaken for PAGASA names.
  - **Damage + deaths:** reads the infobox (`fatalities`, `damage(s)`, `damage-prefix`, `year`) of each matched storm's own article. Ranges, "at least", ">", pesos/other currencies, "unknown" → `needs_review = true` (shown as "approximate"). Articles that redirect to a whole season page are skipped (they'd give season totals).
  - **Retired names:** parses the tables on "List of retired Philippine typhoon names" → `data/retired-names.csv` (also lists PH-only deaths, used in Step 9).
- Parsers live in `scripts/lib/wiki.ts` with 9 unit tests: `npm run test:scripts`.
- **"Entered the PAR" now also includes storms PAGASA named** even if the IBTrACS track just misses the PAR polygon (agencies' positions differ near the edge, e.g. Jelawat/Caloy 2018, Lupit/Huaning 2021). Total storms: 1,805.
- Result: **640 storms with a local name** (572 by name, 46 by JTWC number, 5 by dates, 17 pre-1990 from the retired list), **393 with deaths/damage** (78 need review), **90 of 96 retired names** matched.
- 31 Wikipedia sections couldn't be matched: almost all are PAGASA-only depressions that IBTrACS doesn't track (e.g. TD Winnie 2004, the deadly Quezon floods), plus 3 storms from late 2026 that IBTrACS hasn't added yet. They're listed in `data/raw/wikipedia-unmatched.txt` and skipped, as the plan says.
- Famous storms all matched: Yolanda (Haiyan) 6,352 deaths / >$2.98B, Odette (Rai), Ondoy (Ketsana), Pepeng (Parma), Sendong (Washi, range → approximate), Pablo (Bopha), Rolly (Goni), Ulysses (Vamco), Uring (Thelma), Reming (Durian), Frank (Fengshen), Glenda (Rammasun), Kristine (Trami), Carina (Gaemi), Agaton (Megi), Paeng (Nalgae).
- `npm run data:typhoons` now runs: fetch IBTrACS → fetch Wikipedia → build typhoons.

**How to test**
- `npm run test:scripts` → 9 passing tests.
- Open http://localhost:3000/bagyo and search "yolanda": "Yolanda (Haiyan) 2013 · 6,352 dead (all areas)".

### Step 8: Typhoon detail pages (2026-10-29)
**Done**
- `/bagyo/[id]`: one static page per storm, **1,805 pages** pre-rendered with `generateStaticParams` (`dynamicParams = false`). Full build takes ~40 s on this laptop.
- Each page: both names ("Yolanda (Haiyan), 2013"), category chip, dates in PHT, retired-name and provisional badges, map with the full track colored by strength (start/end markers, PAR outline, legend), wind speed over time chart with PAGASA threshold lines, stat cards (peak wind, peak inside PAR, lowest pressure, time inside PAR), damage card (Wikipedia totals labeled "Total, all areas", USD with year, "approximate" label for `needs_review` values, source link, "As written on Wikipedia" text; or "No damage data yet"), provinces card (fills in at Step 10), sources (IBTrACS storm page + Wikipedia), prev/next storm links.
- Map and chart load client-side only (lazy), so the HTML stays small (~29 KB per page).
- `src/lib/data-server.ts`: build-time JSON readers for server components.

**How to test**
- `npm run build && npm run preview`, open `/bagyo/2013306N07162` (Yolanda): 230 km/h, 895 hPa, 6,352 deaths, >$2.98 billion (2013 USD) marked approximate.
- Click "Details →" on any storm in `/bagyo`, then use the ← / → links at the bottom.

### Step 9: Spot-check + overrides (2026-10-29)
**Done**
- Reviewed all 78 `needs_review` rows. Most are real approximations (ranges, "at least", ">" prefixes) and stay marked "approximate". Fixed the parser (not the CSV) where it was wrong, with new unit tests:
  - breakdowns were being added up: "22 total (21 in Vietnam and 1 in Hainan)" gave 44 → now 22; "67 direct, 4 indirect (71 total)" → 71; "61 (51 direct, 10 indirect)" → 61; "187 total (including 83 aboard…)" → 187.
  - "None reported" → 0.
  - per-country damage sums like "22630000+11100000" → added up (marked approximate).
- Fixed retired-name matching: some rows list the year the name was retired (Julian/Krathon was matched to a wrong 2023 storm), and footnote rows were read as names. Now 91 of 92 retired names match (the missing one is TD Winnie 2004, not in IBTrACS).
- Famous storms checked: Yolanda, Odette, Ondoy, Sendong, Pablo, Rolly, Ulysses, Pepeng (plus Uring, Reming, Frank, Glenda, Kristine, Carina, Agaton, Paeng). Names, dates, winds and infobox numbers all line up.
- **Curated PH-only deaths** (for the deadliest list) are in `data/overrides.csv` as `ph_deaths` + `ph_source_url` rows (82 storms). Source: the "List of retired Philippine typhoon names" table (each row cites PAGASA / NDRRMC / NDCC), kept only where the number is plausible next to the all-areas total; Ulysses uses the NDRRMC figure from its own article (see "Needs Dewdew").
- Deadliest in PH now: 1. Yolanda 2013 (6,300) · 2. Uring 1991 (5,101) · 3. Sendong 2011 (1,268) · 4. Pablo 2012 (1,067) · 5. Rosing 1995 (936) · 6. Nitang 1984 (900) · 7. Undang 1984 (895) · 8. Sisang 1987 (808) · 9. Reming 2006 (734) · 10. Titang 1970 (631).
- Storm pages show "Deaths in the Philippines" (curated, with source) above the all-areas totals.

**How to test**
- `/bagyo` → **Stats** tab → "Deadliest in the Philippines" shows the list above.
- `/bagyo/2013306N07162`: "Deaths in the Philippines 6,300" plus "Deaths, total all areas 6,352".

### Step 10: Affected provinces (2026-10-29)
**Done**
- `scripts/compute-affected.ts`: a province is in a storm's **approximate path area** when the full 3-hourly IBTrACS track passes within ~50 km of it (or runs through it). Writes `data/affected-provinces.json`; `build-typhoons.ts` joins it. Runs in ~6 s.
- 828 of 1,805 storms have a path area over at least one province. Most often hit: Cagayan (245), Aurora, Isabela, Quezon, Palawan, Eastern Samar, Samar, Ilocos Sur.
- Spot-checks: Yolanda → Eastern Samar, Samar, Leyte, Biliran, Cebu, Capiz, Aklan, Iloilo, Antique, Negros Occ., Occidental Mindoro, Palawan…; Rolly → Catanduanes, Albay, Camarines Sur, Quezon, Laguna, Batangas, Metro Manila…
- Note: Ondoy's center passed north of Metro Manila (> 50 km away), so Metro Manila isn't in its path area even though its rain flooded the city. That's why it's labeled "approximate path area, not official".
- Storm pages now list the provinces (links to `/lugar/...`, built in Step 12) and highlight them on the map.
- `/bagyo` filter: **Province hit (approximate path area)** dropdown is now visible; `/bagyo?province=bohol` opens with that filter.
- npm scripts: `data:typhoons` now includes `compute-affected`; new `data:all` runs provinces → quakes → typhoons.

**How to test**
- Open `/bagyo`, pick "Bohol" in the province filter: 71 storms; pick a decade to see their tracks.
- Open `/bagyo/2013306N07162` (Yolanda): the provinces card lists Leyte, Samar, etc., and they're shaded on the map.

### Step 11: Retired names page (2026-10-29)
**Done**
- `/bagyo/retired`: all 92 retired PAGASA names, grouped by decade (newest first): local name (international name) linking to the storm page, year, peak strength chip + km/h, deaths in PH and damage in pesos as listed. TD Winnie 2004 is listed but has no storm page (not in IBTrACS).
- `build-typhoons.ts` now writes `public/data/typhoons/retired.json` (20 KB).
- Fixed the retired-table parser for `rowspan` cells (one value spread over several rows) and unquoted cell attributes (`rowspan=2|`). This changed three curated numbers, corrected by hand in `data/overrides.csv`: **Nando 2025 → 4** and **Opong 2025 → 42** (the old values were their "missing" counts), and **Kristine 2024 removed** from the curated list because the table gives one combined count for Kristine + Leon. Combined counts are marked with * on the page (new `deaths_ambiguous` column in `retired-names.csv`).
- Links to the page from `/bagyo` ("Retired names →") and the "Retired name" badge on storm pages.
- 11 parser unit tests now (`npm run test:scripts`).

**How to test**
- Open `/bagyo/retired`: Yolanda 2013 shows 6,300 deaths and ₱95.5 billion; Kristine/Leon 2024 show 159*.
- Click "Yolanda": opens the Haiyan storm page.

### Step 12: My Place (2026-10-29)
**Done**
- `/lugar`: pick a province from a dropdown (grouped by region) or tap it on the map. The map is a choropleth you can switch between **Typhoons** (storms in path area since 1945) and **Earthquakes** (M4.5+ since 1900), with a legend and hover tooltips. Plus a sortable table of all 84 provinces.
- `/lugar/[province]`: one static page per province (84 pages). Shows:
  - stat cards: quakes since 1900 (on land vs offshore), strongest quake + M6+ count, typhoons in the path area + latest one, deadliest typhoon (curated PH deaths, labeled "deaths nationwide").
  - map zoomed to the province (highlighted) with its quakes.
  - storms per decade and quakes per decade charts.
  - lists: strongest quakes (USGS links), deadliest typhoons, strongest typhoons, most recent, and a link to `/bagyo?province=<slug>` for the full list.
- `src/lib/province-stats.ts`: build-time counts per province shared by both pages.
- Storm pages' province chips now link here.

**How to test**
- Open `/lugar`, switch the map to **Earthquakes**: Davao Oriental and Surigao del Sur are darkest. Click Leyte.
- `/lugar/leyte`: 89 quakes (strongest M7.1, 1908), 135 typhoons, deadliest Yolanda (Haiyan) 2013 with 6,300 deaths nationwide.

### Step 13: Landing, sources, README, polish (2026-10-29)
**Done**
- **Landing page (`/`)**, designed with the design-taste skill (direction "contact sheet"): the name at poster size, one sentence on what the site is, a "Look up your province" button, and links to the four sections with real counts. Then **"Storms that changed the list"**: a contact sheet of 8 storms PAGASA retired (Yolanda, Sendong, Pablo, Odette, Ondoy, Rolly, Ulysses, Rosing), each shown as its satellite image, its track and its winds drawn from our own data, plus the 1990 Luzon and 2013 Bohol earthquakes with photos and their epicentres. Then **"Your province"**, a live picker that tells you a province's typhoon and quake count, strongest quake and deadliest storm. Then "In numbers", "Deadliest typhoons", "About this project".
- Pictures: 11 real images from Wikimedia Commons (NASA / NOAA / Chiba University satellite images, PHIVOLCS photo of the 1990 Baguio hotel collapse, two CC BY-SA photos of Bohol churches), resized to small JPEGs with `scripts/optimize-images.mjs` (436 KB total). Credits in `public/images/archive/credits.json`, on the landing page and on `/sources#pictures`.
- Design checks: the skill's lint has 0 issues; its browser inspector at 1440/768/390 px gives **0 FAIL** and 2 warnings I kept on purpose: no video (keeps the page light on mobile data) and system font instead of the dealt "General Sans" (no external font request, same font as the rest of the site).
- **Sources page (`/sources`)**: every data source with licence and citation (USGS, IBTrACS with DOI, Wikipedia CC BY-SA, PSGC boundaries, OSM), the methods (PAR rule, PAGASA scale, wind conversion, path area, curated deaths), picture credits, and links to PAGASA, PHIVOLCS, NDRRMC, EMSC.
- **README.md** with screenshots (`docs/screenshots/`, taken with headless Edge), features, data sources, how to run, how to refresh the data, how to add manual fixes, how the numbers are made, structure, limitations.
- **Polish**: theme toggle uses drawn icons instead of an emoji; header and footer have no hairlines (tone steps instead) and share the page margins; nav scrolls on phones without a scrollbar; footer text is 14px+; chart axis labels no longer clipped; Linog markers are added in small time slices and charts load only when scrolled into view (mobile blocking time: Linog 2.2 s → 1.2 s, storm page 1.1 s → 0.7 s).
- Checked at 375px width (phone): no page scrolls sideways.

**How to test**
- `npm run build && npm run preview`, open `/`: change the province in "Your province" and the sentence updates; hover a storm in the contact sheet and the others dim; click it to open its page.
- Open `/sources` and click any credit link.
- `npm run lint` and `npm run test:scripts` both pass.

## Summary
All 13 steps of the Build Order are done and committed. What's left is in **Needs Dewdew** at the top: GitHub push, Vercel deploy, the demo video, your edit of the "Problem I solved" note, and two optional follow-ups (map-page Lighthouse score, three death counts to check).

## Next: UI/UX redesign (planned 2026-10-29, not started)
Dewdew's answers: everything feels messy (map pages, navigation, storm/province pages, phone). Full redesign, clean and light style, same data and URLs.
1. Design system: light by default (dark still available), bigger type, fewer borders, one accent; keep the orange strength ramp.
2. Navigation: clearer header, site-wide storm/province search, breadcrumbs everywhere, simpler phone menu.
3. Map pages: map first and full width, one filter-chip bar above it, advanced filters in a drawer, small legend chip, charts and lists below the map, side panel for a selected storm/quake.
4. Storm page: one big summary line, then map, then details.
5. Province page: same pattern (summary, map, top lists).
6. Phone pass on every page.
7. Check: build, design inspector at 3 widths, Lighthouse, before/after screenshots, then commit + push.
Show Dewdew screenshots after steps 1–3 before continuing.

Live site: https://ph-disaster-history.vercel.app (auto-deploys on push to main). Still to do from earlier: add the live link to README and project-ideas.md.

### Redesign step 1: look, feel, navigation (2026-10-30)
Mockup approved by Dewdew first (artifact canvas: storm page, phone, search, colours, home).
**Done**
- **Colours and type** (`src/app/globals.css`): white page, soft grey panels, ink text, one orange accent (#c2410c / #fb923c dark); true neutral dark mode instead of navy. Body text 17px, nothing under 14px (Tailwind `text-xs/sm/base` raised). Old teal map highlights now ink.
- **Light by default** (`src/app/layout.tsx`): dark only if the visitor picks it.
- **Header** (`src/components/SiteHeader.tsx`, `src/components/nav/`): logo mark, bilingual nav (Linog · Earthquakes, Bagyo · Typhoons, My Province, Sources) with a grey pill on the current section, and a **search for typhoons and provinces** (type, arrow keys, Enter; "/" focuses it). Index built at `/search-index.json` (80 KB, loaded only when you use search).
- **Phone**: search icon opens a full-screen search; **bottom tab bar** (Quakes, Typhoons, My Province, Sources).
- **Footer**: one short line of sources + "All sources →".
- Storm page breadcrumb removed (Dewdew's call). Section names renamed everywhere.

**How to test**
- `npm run build && npm run preview`, open any page: type "sa" in the search → Samar provinces + storms; Enter opens one.
- Phone width (375px): tab bar at the bottom, search icon opens full-screen search, no page scrolls sideways (checked on 8 pages).
- Next: step 2 (map pages), then storm/province pages and the new home page from the mockup.

### Real satellite photos of storms (2026-10-30)
**Done**
- `scripts/fetch-satellite.ts` (`npm run data:satellite`): NASA Worldview Snapshots API (MODIS Terra/Aqua, public domain, no key). For every storm since 2000 that was a typhoon, deadly or retired (272), it tries its strongest days on both satellites, centres the photo on the storm's position at the satellite pass, and skips photos where the storm sits in a gap between passes. 269 found, 3 without a clear photo. 15 MB in `public/images/satellite/`, list in `public/data/typhoons/satellite.json`.
- Older deadly storms (Uring 1991, Rosing 1995, Nitang 1984, Undang 1984, Sisang 1987): NOAA/NASA photos from Wikimedia Commons, credited in `public/images/archive/credits.json`.
- Storm page: photo above the map with date and satellite. Home: deadliest typhoons are now 8 photo cards + "View more". Sources page credits NASA Worldview.

**How to test**
- Open `/bagyo/2013306N07162` (Yolanda): the eye is in the middle of the photo. Home: scroll to "Deadliest typhoons".

### Redesign step 2: map pages (2026-10-30)
Mockup approved by Dewdew first (canvas "Step 2 · Map pages").
**Done**
- `/linog` and `/bagyo` rebuilt: title + count, one row of filter chips, the map full width, charts and lists below. No more sidebar.
- **Chips** (`src/components/ui/Chips.tsx`): quakes = Strong (M6.5+), Last 50 years, Shallow, On land only; storms = latest decade, Super typhoons, Deadly, Retired names, Hit my province. "More filters" opens a drawer with all sliders/selects (`FilterDrawer.tsx`); "Clear" resets. New filters: `landOnly`, `deadly`, `retired`.
- **Click a quake or storm** → side panel on the map (bottom sheet on phones, `MapSidePanel.tsx`) with big facts and "Open on USGS" / "Open full page". Storms show their NASA/NOAA satellite photo. Popups removed on these maps; the selected quake gets a ring.
- Legends are one small pill in the map corner.

**How to test**
- `/bagyo`: tap "Super typhoons" → 21 storms; tap Odette in the list (or its track) → panel with the Dec 16, 2021 NASA photo, 195 km/h, 405 dead in PH.
- `/linog`: tap "Strong (M6.5+)" → 236 quakes; click the 1918 M8.3 → panel, ring on the map.
- Phone width: chips scroll sideways, the panel is a bottom sheet above the tab bar, no sideways page scroll.
