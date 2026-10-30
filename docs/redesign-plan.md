# UI/UX redesign plan (2026-10-30)

Goal: clean, light, easy to use. Same data, same URLs, same locked decisions (CLAUDE.md).

## Rules for every page
- **Show, don't tell.** Maps, numbers and charts carry the page; text is short labels, not paragraphs.
- Max one sentence under a heading. No explanation blocks; method notes move to `/sources` or a small "ⓘ" tooltip.
- No text over busy backgrounds; text sits on plain, calm surfaces only.
- Big numbers with short labels instead of sentences ("6,300 · dead in PH").
- Light by default (dark optional), body 17px, nothing under 14px, one accent color, fewer outlined boxes.
- Orange strength ramp (TD→STY, M4.5→M8+) stays.

## Navigation
- Header: logo · Linog / Earthquakes · Bagyo / Typhoons · My Province · Sources · search (storms + provinces).
- Phone: top bar with search + bottom tab bar.
- Breadcrumbs on inner pages, "Related" links at the bottom.

## Map pages (Linog, Bagyo)
- Map first, full width.
- One chip filter bar above the map (quakes: M6+, Last 50 years, Shallow; storms: 2020s, Super typhoons, Deadly); "More filters" drawer for sliders.
- Legend as one small corner chip.
- Click → side panel (bottom panel on phone) with key facts + "Open full page".
- Charts and lists below the map, full width.

## Storm page
- One summary line (category · peak wind · PH deaths · date), province chips, big map, wind chart, damage + sources, prev/next, "Other storms that hit <province>".

## Province page
- One summary line, map with quakes / storms / both toggle, two ranked lists.

## Landing
- Big search + "Explore earthquakes" / "Explore typhoons" at the top, cleaned-up contact sheet, minimal text.

## Steps (screenshots shown to Dewdew between steps)
1. Look, feel, navigation
2. Map pages
3. Storm + province pages
4. Landing + phone pass
5. Checks (inspector, Lighthouse, before/after screenshots), then push
