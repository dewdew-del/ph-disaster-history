# PH Disaster History

Merged project: **Linog Map** (where strong earthquakes hit the Philippines most often) + **Bagyo Archive** (history of Philippine typhoons, their local names, damage and the places each one hit). *(Linog = "earthquake", Bagyo = "typhoon")*

Portfolio project (see `..\project-ideas.md`). Build phase: **Phase 3 (Data + Maps)**. Folder: `D:\dev\ph-disaster-history`. Shared rules are in `..\CLAUDE.md`.

## Main rule
**Follow `PLAN.md` for all work in this project.** It has the stack, data pipeline, features, folder structure and build order. If anything here conflicts with PLAN.md, PLAN.md wins.

## Status
- **In progress.** Plan is locked. Build step by step using the Build Order in PLAN.md.
- Work through the Build Order autonomously, without waiting for approval between steps.
- After each step: run `npm run build` and fix any errors, make a git commit ("Step N: ..."), and add a short entry to `PROGRESS.md` (what was done, how to test it).
- Only stop if truly blocked by something that needs Dewdew (a login, a decision that changes PLAN.md). Write it under "Needs Dewdew" in `PROGRESS.md`, skip ahead to any step that isn't blocked, and keep going.
- Don't push to GitHub or deploy to Vercel unless asked.

## Locked decisions
- Earthquakes: 1900 to present, magnitude 4.5+ (from USGS), box 4–21.5°N, 116–128°E (widened from 127°E to include the Philippine Trench)
- Quakes outside a PH province: "Offshore, near <province>" if within ~100 km of a PH province; otherwise "Outside PH" (USGS place names another country, or farther than 100 km). Outside PH quakes stay on the map but count toward no province
- Typhoons: IBTrACS storms that entered the real PAR polygon, **1945 to present** (pre-1945 storms have no wind data). Main + provisional tracks, no spur tracks
- Strength scale: PAGASA categories (TD/TS/STS/TY/STY, km/h). Use JMA 10-min wind; if missing, JTWC 1-min wind × 0.88, labeled "estimated"
- Local (PAGASA) names: 1990 to present, auto-filled from Wikipedia
- Damage and deaths: auto-filled from Wikipedia infoboxes, shown in USD as listed, then spot-checked. Infobox numbers are totals for all countries, labeled "Total, all areas". Storms without data show "No damage data yet"
- Deadliest list: only storms with a verified PH-only death count in `data/overrides.csv` (field `ph_deaths`, with source)
- Metro Manila: the 4 NCR districts are merged into one "Metro Manila"
- Wikipedia script User-Agent includes `https://github.com/dewdew-del` as contact (no email)
- Times shown in PH time (UTC+8). Dark mode uses darkened OSM tiles
- Manual fixes go in `data/overrides.csv` only, never in the generated CSVs

## Out of scope (v2)
- Volcano eruptions, floods, live alerts
- Deadliest earthquakes list (USGS has no death counts)

## Working rules
- Always give complete file replacements, never partial snippets
- Keep it static: no database, no backend, no API keys
- Show sources on every page
- Keep generated JSON small (split or simplify anything over ~2 MB)

## Done checklist
- [ ] Live link
- [ ] README with screenshots
- [ ] 30-second demo video
- [ ] "Problem I solved" note for the portfolio
- [ ] Sources and credits shown
- [ ] Pushed to GitHub
