// data/raw/quakes/*.json -> public/data/quakes.json + public/data/quakes-summary.json
// Tags each quake with its province: inside a province, offshore near one (<= 100 km),
// or "Outside PH" (USGS place names another country, or farther than 100 km).
// Needs data/raw/provinces/provinces-detail.json (run build-provinces.ts first).
// Run: npx tsx scripts/build-earthquakes.ts
import fs from "node:fs";
import path from "node:path";
import { PUBLIC_DATA_DIR, RAW_DIR, checkSize, writeJson } from "./lib/paths";
import { loadProvinces } from "./lib/provinces";
import {
  WHERE_LAND,
  WHERE_OFFSHORE,
  WHERE_OUTSIDE,
  toQuake,
  type QuakeProvinceStat,
  type QuakeRow,
  type QuakesFile,
  type QuakesSummary,
} from "../src/lib/types";

type UsgsFeature = {
  id: string;
  properties: { mag: number | null; place: string | null; time: number };
  geometry: { coordinates: [number, number, number] };
};

const OFFSHORE_KM = 100;
const OTHER_COUNTRY = /\b(Malaysia|Indonesia|Taiwan|China|Brunei|Sabah|Sulawesi|Talaud)\b/i;

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
const yearPH = (t: number) => new Date((t + 8 * 3600) * 1000).getUTCFullYear();

function loadRaw(): QuakeRow[] {
  const dir = path.join(RAW_DIR, "quakes");
  const files = fs.readdirSync(dir).filter((f) => /^quakes-\d{4}\.json$/.test(f));
  const byId = new Map<string, QuakeRow>();
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as { features: UsgsFeature[] };
    for (const q of data.features) {
      const mag = q.properties.mag;
      if (mag === null || mag < 4.5) continue;
      const [lon, lat, depth] = q.geometry.coordinates;
      byId.set(q.id, [
        q.id,
        Math.round(q.properties.time / 1000),
        round(mag, 1),
        round(depth ?? 0, 1),
        round(lat, 3),
        round(lon, 3),
        // Shorten the most common suffix to keep the file small; the UI shows it as-is.
        (q.properties.place ?? "").replace(/, Philippines$/, ""),
        -1,
        WHERE_OUTSIDE,
      ]);
    }
  }
  return [...byId.values()].sort((a, b) => a[1] - b[1]);
}

const BANDS: [string, number, number][] = [
  ["4.5–4.9", 4.5, 5],
  ["5.0–5.9", 5, 6],
  ["6.0–6.9", 6, 7],
  ["7.0–7.9", 7, 8],
  ["8.0+", 8, 99],
];

function main() {
  const rows = loadRaw();
  const provinces = loadProvinces();
  const generated = new Date().toISOString().slice(0, 10);

  let land = 0;
  let offshore = 0;
  for (const r of rows) {
    const [, , , , lat, lon, place] = r;
    const inside = provinces.containing(lon, lat);
    if (inside >= 0) {
      r[7] = inside;
      r[8] = WHERE_LAND;
      land++;
      continue;
    }
    const near = provinces.nearest(lon, lat, OFFSHORE_KM);
    if (near && !OTHER_COUNTRY.test(place)) {
      r[7] = near.index;
      r[8] = WHERE_OFFSHORE;
      offshore++;
    } else {
      r[7] = -1;
      r[8] = WHERE_OUTSIDE;
    }
  }

  const file: QuakesFile = {
    generated,
    count: rows.length,
    provinces: provinces.slugs,
    provinceNames: provinces.names,
    rows,
  };

  const quakes = rows.map(toQuake);
  const years = new Map<number, { count: number; m6: number }>();
  for (const q of quakes) {
    const y = yearPH(q.time);
    const e = years.get(y) ?? { count: 0, m6: 0 };
    e.count++;
    if (q.mag >= 6) e.m6++;
    years.set(y, e);
  }
  const firstYear = 1900;
  const lastYear = new Date().getUTCFullYear();
  const perYear = [];
  for (let y = firstYear; y <= lastYear; y++) perYear.push({ year: y, ...(years.get(y) ?? { count: 0, m6: 0 }) });

  const provStats: QuakeProvinceStat[] = provinces.slugs.map((slug, i) => ({
    slug,
    name: provinces.names[i],
    count: 0,
    m6: 0,
    maxMag: 0,
    strongestId: null,
  }));
  for (const q of quakes) {
    if (q.prov < 0) continue;
    const s = provStats[q.prov];
    s.count++;
    if (q.mag >= 6) s.m6++;
    if (q.mag > s.maxMag) {
      s.maxMag = q.mag;
      s.strongestId = q.id;
    }
  }

  const summary: QuakesSummary = {
    generated,
    total: quakes.length,
    m6: quakes.filter((q) => q.mag >= 6).length,
    m7: quakes.filter((q) => q.mag >= 7).length,
    firstYear,
    lastYear,
    outsidePh: rows.length - land - offshore,
    perYear,
    bands: BANDS.map(([band, lo, hi]) => ({ band, count: quakes.filter((q) => q.mag >= lo && q.mag < hi).length })),
    strongest: [...quakes].sort((a, b) => b.mag - a.mag || a.time - b.time).slice(0, 20),
    provinces: provStats.sort((a, b) => b.count - a.count),
  };

  console.log(`Quakes: ${summary.total} (M6+: ${summary.m6}, M7+: ${summary.m7})`);
  console.log(`  on land: ${land}, offshore near a province: ${offshore}, outside PH: ${summary.outsidePh}`);
  console.log(
    `  top provinces: ${summary.provinces
      .slice(0, 5)
      .map((p) => `${p.name} ${p.count}`)
      .join(", ")}`,
  );
  checkSize("public/data/quakes.json", writeJson(path.join(PUBLIC_DATA_DIR, "quakes.json"), file));
  checkSize("public/data/quakes-summary.json", writeJson(path.join(PUBLIC_DATA_DIR, "quakes-summary.json"), summary));
}

main();
