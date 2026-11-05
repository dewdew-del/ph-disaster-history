# Minimal redesign plan, "Quiet atlas" (2026-11-06)

Second pass after the 2026-10-30 redesign. Dewdew picked direction A from the mockup
(artifact "PH Disaster History minimal mockup"). Same data, URLs and locked decisions (PLAN.md).
**Nothing is removed**: every filter, the heatmap, My Province, Sources and Retired names stay, just out of the way.

## Look
- Cool grey paper (`#f5f6f7`), ink text, hairline rules. No grey cards or rounded boxes as decoration.
- Ink is the only UI color (links, buttons, active states). Orange ramp only on data (dots, tracks, category marks).
- Instrument Serif for headings and big numbers (`.num`), Public Sans for text. Both self-hosted via next/font.
- Dark mode kept, same rules.

## Navigation
- Header: serif wordmark · Linog · Bagyo · My Province · search icon · theme. Search opens an overlay (full screen on phones), "/" opens it.
- Footer: one line of data credits + Sources + Retired names.
- Phone tab bar: Home · Quakes · Typhoons · My Province.

## Map pages (/linog, /bagyo)
- Map fills the screen under the header.
- Floating on the map: count pill + "Filters" button (top-left), small legend (bottom-left).
- Filters panel (right drawer, bottom sheet on phones) holds everything: Dots/Heatmap, quick picks (old chips), sliders, selects, Clear.
- Click a quake/storm → the existing side panel. Charts and lists sit below the map, behind one quiet heading.

## Storm page
- Big serif name, one line under it (category · English name · dates · retired), 4 numbers in a hairline row.
- Map + satellite photo side by side. Provinces, wind chart, related storms, sources as plain sections with hairline rules.

## Province page
- Same pattern: serif name, numbers row, map, two ranked lists as plain rows.

## Home
- Headline, 2 big numbers, 2 text links, the quake map drawn from real data. Deadliest typhoons as a plain ranked list (top 5). Hero photo removed.

## Steps (build + commit after each)
1. Theme, fonts, header, search overlay, footer, tab bar
2. Map pages: full-bleed map, floating pill + Filters, drawer holds all filters
3. Storm + province pages
4. Home
5. Sources + retired pages, phone and dark checks, screenshots
