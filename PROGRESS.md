# PH Disaster History: Progress Log

Build follows the Build Order in `PLAN.md`. Each step: `npm run build` passes, one git commit ("Step N: ..."), one entry here.

## Needs Dewdew
- **Vercel deploy (Steps 1 and 3 say "deploy" / "ship it").** Skipped on purpose: the project rule is no deploys unless you ask. When you're ready: push to GitHub, then import the repo on vercel.com (Framework: Next.js, no settings to change). The site is a static export, so the free Hobby plan is enough.

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
