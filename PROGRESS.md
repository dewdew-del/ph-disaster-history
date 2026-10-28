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
