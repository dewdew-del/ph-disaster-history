// NASA satellite photos of storms (2000 to present) ->
//   public/images/satellite/<sid>.jpg
//   public/data/typhoons/satellite.json   sid -> { file, date, source, credit }
// Source: NASA Worldview Snapshots API (GIBS, MODIS true colour), public domain, no key.
// For each storm the script tries the days around its peak inside the PAR, on both Terra and Aqua,
// centres the picture on the storm's position at the satellite's pass, and skips pictures where the
// storm sits in a gap between passes. Older storms use the NOAA pictures listed in MANUAL.
// Already-fetched storms are skipped (use --force to redo, --only=<sid>,<sid> for a few). Run: npx tsx scripts/fetch-satellite.ts
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { sleep } from "./lib/http";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "images", "satellite");
const INDEX = path.join(ROOT, "public", "data", "typhoons", "index.json");
const DETAIL_DIR = path.join(ROOT, "public", "data", "typhoons");
const OUT_JSON = path.join(DETAIL_DIR, "satellite.json");
const force = process.argv.includes("--force");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");

const API = "https://wvs.earthdata.nasa.gov/api/v1/snapshot";
const WIDTH = 720;
const HEIGHT = 600;
const HALF_LON = 6; // degrees either side of the storm centre
const HALF_LAT = (HALF_LON * HEIGHT) / WIDTH;

// Approximate equator crossing time (UTC hours) over the Philippines (~125°E): local 10:30 (Terra), 13:30 (Aqua).
const SATS = [
  { layer: "MODIS_Aqua_CorrectedReflectance_TrueColor", name: "NASA Aqua", utcHour: 5.5 },
  { layer: "MODIS_Terra_CorrectedReflectance_TrueColor", name: "NASA Terra", utcHour: 2.5 },
];

// Storms before 2000 (no MODIS): NOAA / NASA pictures from Wikimedia Commons, credited in public/images/archive/credits.json.
const MANUAL: Record<string, { file: string; date: string; source: string }> = {
  "1991304N08140": { file: "/images/archive/thelma-nov-4-1991-0636z.min.jpg", date: "1991-11-04", source: "NOAA" },
  "1984239N08146": { file: "/images/archive/ike-1984-09-04-0753z.min.jpg", date: "1984-09-04", source: "NASA" },
  "1984302N00149": { file: "/images/archive/agnes-nov-4-1984-0700z.min.jpg", date: "1984-11-04", source: "NOAA" },
  "1987320N03171": { file: "/images/archive/nina-1987-11-25-0702z.min.jpg", date: "1987-11-25", source: "NOAA" },
  "1995293N05177": { file: "/images/archive/angela-1995-11-01-0631z.min.jpg", date: "1995-11-01", source: "NOAA" },
};

type Summary = { id: string; season: number; cat: string; phDeaths: number | null; retired: boolean };
type TrackPoint = [number, number, number, number | null, number | null, number, number, number];
type Entry = { file: string; date: string; source: string };

const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

/** Storm position at unix time t, interpolated along the track (lon 0-360). */
function positionAt(track: TrackPoint[], t: number): [number, number] | null {
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1];
    const b = track[i];
    if (t >= a[0] && t <= b[0]) {
      const f = (t - a[0]) / (b[0] - a[0] || 1);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  return null;
}

/** True when the centre of the picture is cloud (the storm) and no gap between passes covers it. */
async function looksGood(buf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let black = 0;
  let centreBlack = 0;
  let centreBright = 0;
  let centre = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const isBlack = data[i] < 6 && data[i + 1] < 6 && data[i + 2] < 6;
      if (isBlack) black++;
      const inCentre = Math.abs(x - info.width / 2) < info.width * 0.22 && Math.abs(y - info.height / 2) < info.height * 0.22;
      if (inCentre) {
        centre++;
        if (isBlack) centreBlack++;
        if (v > 150) centreBright++;
      }
    }
  }
  const total = info.width * info.height;
  return black / total < 0.12 && centreBlack / centre < 0.01 && centreBright / centre > 0.35;
}

async function fetchSnapshot(layer: string, date: string, lat: number, lon: number): Promise<Buffer | null> {
  const lonW = lon > 180 ? lon - 360 : lon;
  const bbox = [lat - HALF_LAT, lonW - HALF_LON, lat + HALF_LAT, lonW + HALF_LON].map((v) => v.toFixed(3)).join(",");
  const url = `${API}?REQUEST=GetSnapshot&TIME=${date}&BBOX=${bbox}&CRS=EPSG:4326&LAYERS=${layer}&WRAP=day&FORMAT=image/jpeg&WIDTH=${WIDTH}&HEIGHT=${HEIGHT}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ph-disaster-history (https://github.com/dewdew-del)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt === 2) {
        console.warn(`  ${date} ${layer}: ${(e as Error).message}`);
        return null;
      }
      await sleep(2000);
    }
  }
  return null;
}

async function findPicture(s: Summary): Promise<Entry | null> {
  const detail = JSON.parse(fs.readFileSync(path.join(DETAIL_DIR, `${s.id}.json`), "utf8")) as { track: TrackPoint[] };
  const track = detail.track;
  const inPar = track.filter((p) => p[7] === 1);
  const pool = inPar.length ? inPar : track;
  // Days ranked by the strongest wind the storm had that day (inside the PAR when it was there).
  const best = new Map<string, number>();
  for (const p of pool) best.set(day(p[0]), Math.max(best.get(day(p[0])) ?? -1, p[3] ?? 0));
  const days = [...best.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d).slice(0, 4);

  for (const date of days) {
    for (const sat of SATS) {
      const t = Date.parse(`${date}T00:00:00Z`) / 1000 + sat.utcHour * 3600;
      const pos = positionAt(track, t);
      if (!pos) continue;
      const buf = await fetchSnapshot(sat.layer, date, pos[0], pos[1]);
      await sleep(400);
      if (!buf || !(await looksGood(buf))) continue;
      const file = `/images/satellite/${s.id}.jpg`;
      await sharp(buf).jpeg({ quality: 72, mozjpeg: true }).toFile(path.join(ROOT, "public", file));
      return { file, date, source: sat.name };
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index = JSON.parse(fs.readFileSync(INDEX, "utf8")) as { storms: Summary[] };
  const out: Record<string, Entry> = fs.existsSync(OUT_JSON) && !force ? JSON.parse(fs.readFileSync(OUT_JSON, "utf8")) : {};
  const tried: Record<string, true> = {};

  for (const [id, m] of Object.entries(MANUAL)) out[id] = m;

  const wanted = index.storms.filter(
    (s) => s.season >= 2000 && (s.cat === "TY" || s.cat === "STY" || s.phDeaths || s.retired),
  );
  let found = 0;
  for (const [i, s] of wanted.entries()) {
    if (only && !only.includes(s.id)) continue;
    if (out[s.id] && !force) continue;
    const entry = await findPicture(s);
    tried[s.id] = true;
    if (entry) {
      out[s.id] = entry;
      found++;
    }
    console.log(`${i + 1}/${wanted.length} ${s.id} ${entry ? `${entry.date} ${entry.source}` : "no clear picture"}`);
    if (found % 10 === 0) fs.writeFileSync(OUT_JSON, JSON.stringify(out));
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(out));
  console.log(`Done: ${Object.keys(out).length} storms with a picture (${found} new, ${Object.keys(tried).length - found} without a clear one).`);
}

main();
