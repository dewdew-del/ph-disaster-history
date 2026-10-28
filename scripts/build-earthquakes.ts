// data/raw/quakes/*.json -> public/data/quakes.json + public/data/quakes-summary.json
// Run: npx tsx scripts/build-earthquakes.ts
import fs from "node:fs";
import path from "node:path";
import { PUBLIC_DATA_DIR, RAW_DIR, checkSize, writeJson } from "./lib/paths";
import { WHERE_UNTAGGED, toQuake, type QuakeRow, type QuakesFile, type QuakesSummary } from "../src/lib/types";

type UsgsFeature = {
  id: string;
  properties: { mag: number | null; place: string | null; time: number };
  geometry: { coordinates: [number, number, number] };
};

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

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
        q.properties.place ?? "",
        -1,
        WHERE_UNTAGGED,
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
  const generated = new Date().toISOString().slice(0, 10);
  const quakes = rows.map(toQuake);

  const file: QuakesFile = { generated, count: rows.length, provinces: [], provinceNames: [], rows };

  const years = new Map<number, { count: number; m6: number }>();
  for (const q of quakes) {
    const y = new Date(q.time * 1000).getUTCFullYear();
    const e = years.get(y) ?? { count: 0, m6: 0 };
    e.count++;
    if (q.mag >= 6) e.m6++;
    years.set(y, e);
  }
  const firstYear = 1900;
  const lastYear = new Date().getUTCFullYear();
  const perYear = [];
  for (let y = firstYear; y <= lastYear; y++) perYear.push({ year: y, ...(years.get(y) ?? { count: 0, m6: 0 }) });

  const summary: QuakesSummary = {
    generated,
    total: quakes.length,
    m6: quakes.filter((q) => q.mag >= 6).length,
    m7: quakes.filter((q) => q.mag >= 7).length,
    firstYear,
    lastYear,
    outsidePh: 0,
    perYear,
    bands: BANDS.map(([band, lo, hi]) => ({ band, count: quakes.filter((q) => q.mag >= lo && q.mag < hi).length })),
    strongest: [...quakes].sort((a, b) => b.mag - a.mag || a.time - b.time).slice(0, 20),
    provinces: [],
  };

  console.log(`Quakes: ${summary.total} (M6+: ${summary.m6}, M7+: ${summary.m7})`);
  checkSize("public/data/quakes.json", writeJson(path.join(PUBLIC_DATA_DIR, "quakes.json"), file));
  checkSize("public/data/quakes-summary.json", writeJson(path.join(PUBLIC_DATA_DIR, "quakes-summary.json"), summary));
}

main();
