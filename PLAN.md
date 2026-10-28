# PH Disaster History — Build Plan

A static web app that maps the history of strong earthquakes and typhoons in the Philippines.
Two sections in one site: **Linog Map** (earthquakes) and **Bagyo Archive** (typhoons).

## Goals
- Show where strong earthquakes hit the Philippines most often
- Show every typhoon that entered the PAR, with its PAGASA name, track, strength, and (for notable storms) damage and affected provinces
- Fast, free, no backend: all data is preprocessed into static JSON and served from Vercel
- Works well on phones and on a low-spec laptop (no GPU needed)

## Tech Stack
- **Framework:** Next.js (App Router) + TypeScript, static export (`output: 'export'`)
- **Styling:** Tailwind CSS
- **Map:** Leaflet + react-leaflet + OpenStreetMap tiles
- **Charts:** Recharts
- **Data scripts:** Node.js + TypeScript (run with `tsx`), `@turf/turf` for geo math, `mapshaper` for simplifying boundaries
- **Hosting:** Vercel free plan
- **Cost:** ₱0

## Data Sources
| Data | Source | Notes |
|---|---|---|
| Earthquakes | USGS Earthquake Catalog API (`earthquake.usgs.gov/fdsnws/event/1/query`) | Free, no key, GeoJSON. Max 20,000 results per query, so fetch per year |
| Typhoon tracks | IBTrACS (NOAA), Western Pacific CSV | Positions every 3–6 hrs, wind, pressure, international name |
| PAGASA local names | Wikipedia "[year] Pacific typhoon season" pages (MediaWiki API) | Auto-extracted by script from headings like "Typhoon Haiyan (Yolanda)" |
| Damage / deaths | Wikipedia typhoon article infoboxes (MediaWiki API) | Auto-extracted by script; damage kept in USD as Wikipedia lists it |
| Fixes | `data/overrides.csv` (manual) | Only for the few rows the script gets wrong |
| Province boundaries | GitHub PH GeoJSON (PSGC-based) or HDX | Simplify with mapshaper |
| Reference only | PHIVOLCS, EMSC | Link out; don't scrape |

Always show a Sources & Credits page and a short note that USGS magnitudes may differ slightly from PHIVOLCS.

## Folder Structure
```
ph-disaster-history/
├── scripts/
│   ├── fetch-earthquakes.ts      # USGS → data/raw/quakes-YYYY.json
│   ├── build-earthquakes.ts      # raw → public/data/quakes.json
│   ├── fetch-ibtracs.ts          # download IBTrACS WP CSV
│   ├── fetch-wikipedia.ts        # Wikipedia API → data/pagasa-names.csv + data/damage.csv
│   ├── build-typhoons.ts         # CSV + names + damage + overrides → public/data/typhoons/*.json
│   ├── build-provinces.ts        # simplify boundaries → public/data/provinces.json
│   └── compute-affected.ts       # track × provinces intersection
├── data/
│   ├── raw/                      # gitignored downloads
│   ├── pagasa-names.csv          # generated: sid, intl_name, pagasa_name, year, source_url
│   ├── damage.csv                # generated: sid, deaths, damage_usd, damage_year, raw_text, needs_review, source_url
│   └── overrides.csv             # manual fixes: sid, field, value, note (applied last, wins over generated)
├── public/data/                  # generated, committed JSON the site loads
├── src/
│   ├── app/
│   │   ├── page.tsx              # landing: two big cards + key stats
│   │   ├── linog/page.tsx        # earthquake map
│   │   ├── bagyo/page.tsx        # typhoon list + map
│   │   ├── bagyo/[id]/page.tsx   # single typhoon detail
│   │   ├── bagyo/retired/page.tsx # retired PAGASA names
│   │   ├── lugar/page.tsx        # "My place": pick a province
│   │   ├── lugar/[province]/page.tsx # one province's quake + typhoon history
│   │   └── sources/page.tsx      # sources and credits
│   ├── components/               # Map, QuakeLayer, TrackLayer, Filters, YearSlider, StatCards, Charts
│   ├── lib/                      # types, data loaders, color scales, formatters
│   └── styles/
└── README.md
```

## Data Pipeline

### Earthquakes
1. For each year 1900 → current year, query USGS:
   `format=geojson&minlatitude=4&maxlatitude=21.5&minlongitude=116&maxlongitude=128&minmagnitude=4.5&starttime=YYYY-01-01&endtime=YYYY-12-31`
   (128°E, not 127°E, so the Philippine Trench east of Mindanao is included)
2. Save raw per year, then merge.
3. Keep only: `id, time, mag, depth, lat, lon, place`. Round coords to 3 decimals.
4. Tag each quake with the province it's in (point-in-polygon with turf). Offshore within ~100 km of a PH province = "Offshore" + nearest province. Farther than 100 km, or the USGS place names another country (Malaysia, Indonesia, Taiwan, China) = "Outside PH": shown on the map, not counted for any province.
5. Output `public/data/quakes.json` (compact array format to keep size small). Also output `quakes-summary.json` (counts per year, per magnitude band, per province).
6. Note on the per-year chart: the USGS catalog before 1973 mostly lists bigger quakes, so the jump in 1973 is better detection, not more quakes.

### Typhoons
1. Download IBTrACS Western Pacific CSV.
2. Keep storms from **1945 on** whose track passes inside the real PAR polygon (5°N 115°E, 15°N 115°E, 21°N 120°E, 25°N 120°E, 25°N 135°E, 5°N 135°E). Keep `main` and provisional tracks (newest seasons, labeled "provisional"); skip spur tracks. Pre-1945 storms are skipped because IBTrACS has no wind data for them.
3. Per storm keep: `sid, season, intl_name, track points [lat, lon, wind, pressure, time], max_wind, category`.
   - Wind: JMA (TOKYO) 10-min wind; if missing, JTWC (USA) 1-min wind × 0.88, flagged "estimated". Shown in km/h.
   - Category: PAGASA scale on 10-min wind: TD ≤ 61 km/h, TS 62–88, STS 89–117, TY 118–184, STY ≥ 185. No wind = "Unknown".
4. Simplify tracks (turf `simplify`) so each file stays small.
5. Join `pagasa-names.csv` to add local names (Yolanda, Ondoy, Odette…). Storms with no match show only the international name.
6. Join `damage.csv`. Storms with no data get `damage: null` and the UI shows "No damage data yet".
7. Apply `overrides.csv` last, so manual fixes always win.

### Wikipedia Auto-fill (`fetch-wikipedia.ts`)
Uses the official MediaWiki API (`en.wikipedia.org/w/api.php`), no scraping of HTML pages. Set a proper `User-Agent` header and wait ~1 second between requests.

**Local names**
1. For each season 1990 → current year, fetch the wikitext of "[YEAR] Pacific typhoon season".
2. Find storm section headings matching `Name (LocalName)`, e.g. `Typhoon Haiyan (Yolanda)`.
3. Match each to an IBTrACS storm by international name + season. Write `pagasa-names.csv`.
4. Storms with no local name (never entered PAR, or pre-1990) are left blank. That's fine.

**Damage**
1. For each matched storm with its own article, fetch the wikitext and read the weather infobox fields `fatalities` and `damages`.
2. Clean values: strip refs and templates, parse numbers like `6,300`, `≥6,300`, `$2.2 billion`, `(2013 USD)`.
3. Save the cleaned number plus the original `raw_text` and the year of the USD amount.
4. If the value can't be parsed cleanly (ranges, "unknown", mixed currencies, "at least"), set `needs_review = true`.
5. Print a summary at the end: how many storms got names, how many got damage, how many need review.

**Display rules**
- Show damage in USD exactly as Wikipedia lists it, with the year, e.g. "$2.2 billion (2013 USD)". No currency conversion.
- Infobox deaths and damage are totals for every country the storm hit, so label them "Total, all areas".
- Every damage card links to its Wikipedia source.
- Values marked `needs_review` still display, with a small "approximate" label.
- The User-Agent header names the project and `https://github.com/dewdew-del` as contact (no email).

**Matching notes**
- Match by international name + season first; fall back to the JTWC number in headings like `Tropical Depression 30W (Wilma)`, then to dates.
- PAGASA-only depressions with no IBTrACS track (e.g. `Tropical Depression Bising`) are logged and skipped.
7. Compute affected provinces: buffer the track by ~50 km and intersect with provinces. Label it "approximate path area", not official.
8. Output:
   - `public/data/typhoons/index.json` (list: id, names, season, max wind, category, deaths if known)
   - `public/data/typhoons/{sid}.json` (full track + details)

### Provinces
- Source: `faeldon/philippines-json-maps` (MIT, PSGC-based).
- Merge the 4 NCR districts into one "Metro Manila".
- Simplify the boundary GeoJSON to ~5–10% with mapshaper so the file is under ~1 MB.

## Features

### Landing (`/`)
- Two cards: Linog Map and Bagyo Archive, each with a key stat (e.g. "X earthquakes M6+ since 1900", "Y typhoons tracked")
- Short "about" line and link to sources

### Linog Map (`/linog`)
- Map of PH with circle markers sized and colored by magnitude
- Filters: magnitude range (4.5–8+), year range slider, depth band (shallow/intermediate/deep)
- Toggle: markers vs. heatmap (leaflet.heat) to show "where it hits most often"
- Click a quake: popup with date, magnitude, depth, place, link to USGS event page
- Side panel charts: quakes per year (bar), top 10 provinces by count (bar), magnitude distribution
- "Strongest quakes" list (top 20), click to fly to it on the map
- Use marker clustering or canvas renderer (`preferCanvas: true`) so thousands of points stay smooth

### Bagyo Archive (`/bagyo`)
- Searchable list: search by PAGASA or international name, filter by year/decade, category and province hit
- Map showing tracks of the filtered storms, colored by strength along the track. Tracks load from small per-decade files (default: latest decade)
- Stats: storms per year chart, deadliest storms (curated only: PH-only death counts verified in `overrides.csv` field `ph_deaths`)

### Typhoon Detail (`/bagyo/[id]`)
- Both names (e.g. "Yolanda (Haiyan), 2013"), dates, peak wind, category
- Map with the full track, colored by intensity, and affected provinces highlighted
- Damage card: deaths and damage in USD (with year), with a source link, or "No damage data yet"
- Wind speed over time chart
- Prev/next storm navigation
- Pre-render all detail pages at build time (`generateStaticParams`)

### Retired Names (`/bagyo/retired`)
- List of PAGASA names retired after deadly storms (e.g. Yolanda, Odette, Ondoy), each linking to its typhoon page
- Auto-filled by `fetch-wikipedia.ts` from the Wikipedia list of retired Philippine typhoon names, saved to `data/retired-names.csv`

### My Place (`/lugar`)
- Pick a province from a dropdown or by tapping the map
- Province page (`/lugar/[province]`): province highlighted on the map, its earthquakes and the typhoons whose path area touched it
- Stats: total quakes, strongest quake, number of typhoons, worst typhoon (by deaths, where known)
- Uses the province tags already computed for quakes and typhoons; pre-render one page per province with `generateStaticParams`

### Sources (`/sources`)
- Every data source with links and license notes
- Note on PHIVOLCS vs USGS magnitude differences and on "approximate affected areas"

## Design Notes
- Mobile-first; map full width on phones, filters in a bottom sheet
- Dark/light mode (dark mode darkens the OSM tiles with CSS; no extra tile provider)
- All dates and times in PH time (UTC+8)
- Color scale for magnitude and typhoon category, with a legend on every map
- Leaflet must load client-side only (`dynamic(() => import(...), { ssr: false })`)
- Lazy-load typhoon detail JSON; never load all tracks at once on mobile

## Build Order
1. **Setup:** Next.js + Tailwind + Leaflet map showing PH, deployed to Vercel
2. **Earthquake scripts:** fetch + build `quakes.json`
3. **Linog Map MVP:** markers, magnitude/year filters, popups → ship it
4. **Linog extras:** heatmap toggle, charts, strongest list, province tagging
5. **IBTrACS script:** tracks for PAR storms → `typhoons/` JSON
6. **Bagyo list + track map** (international names only first)
7. **Wikipedia auto-fill script** (`fetch-wikipedia.ts`): local names + damage, written to CSV
8. **Typhoon detail pages**
9. **Spot-check:** review rows marked `needs_review` and the famous storms (Yolanda, Odette, Ondoy, Sendong, Pablo, Rolly, Ulysses, Pepeng); put fixes in `overrides.csv`
10. **Affected provinces** computation + highlight, and province filter on the typhoon list
11. **Retired names page**
12. **My Place province view**
13. **Landing page, sources page, README, polish**

## Done Checklist
- [ ] Live Vercel link
- [ ] README with screenshots, data sources, and how to rerun the scripts
- [ ] 30-second demo video
- [ ] "Problem I solved" note for the portfolio
- [ ] Sources and credits page complete
- [ ] Lighthouse mobile score checked (aim for 85+)

## Rules for Claude Code
- Give complete file replacements, never partial snippets
- Keep everything static; no database, no API keys
- Commit generated `public/data/` JSON so Vercel builds don't need to rerun scripts
- Keep each JSON file small; if a file is over ~2 MB, split or simplify it
- Never hand-edit the generated CSVs; put corrections in `overrides.csv` so rerunning the script doesn't erase them
