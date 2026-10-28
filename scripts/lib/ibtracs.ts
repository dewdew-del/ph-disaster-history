// IBTrACS Western Pacific CSV -> storms that entered the PAR (1945+), with PAGASA-scale winds.
// "Entered the PAR" = the IBTrACS track has a point inside the PAR polygon, OR PAGASA gave the
// storm a local name (data/pagasa-names.csv): agencies' positions differ a little near the edge.
// The parsed result (all 1945+ storms) is cached in data/raw/ibtracs/storms.json.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { parseCsv as parseCsvText } from "./csv";
import { DATA_DIR, RAW_DIR } from "./paths";

export const IBTRACS_FILE = path.join(RAW_DIR, "ibtracs", "ibtracs.WP.list.v04r01.csv");
export const IBTRACS_URL =
  "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.WP.list.v04r01.csv";
const CACHE_FILE = path.join(RAW_DIR, "ibtracs", "storms.json");
const CACHE_VERSION = 3;

export const FIRST_SEASON = 1945;
const KEEP_TRACK_TYPES = new Set(["main", "PROVISIONAL", "US-PROVISIONAL"]);

/** Philippine Area of Responsibility, [lon, lat]. */
export const PAR_POLYGON: [number, number][] = [
  [115, 5],
  [115, 15],
  [120, 21],
  [120, 25],
  [135, 25],
  [135, 5],
  [115, 5],
];

export function inPar(lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = PAR_POLYGON.length - 1; i < PAR_POLYGON.length; j = i++) {
    const [xi, yi] = PAR_POLYGON[i];
    const [xj, yj] = PAR_POLYGON[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export type StormPoint = {
  /** unix seconds, UTC */
  t: number;
  lat: number;
  lon: number;
  /** 10-minute sustained wind in km/h (rounded to 5), or null */
  kmh: number | null;
  /** true when kmh was estimated from the JTWC 1-minute wind (x 0.88) */
  est: boolean;
  pres: number | null;
  nature: string;
  par: boolean;
};

export type Storm = {
  sid: string;
  season: number;
  /** Raw IBTrACS names, e.g. ["HAIYAN"] or ["FLOSSIE", "GRACE"]; empty when unnamed */
  names: string[];
  /** JTWC id like "WP312013", or null */
  atcf: string | null;
  provisional: boolean;
  points: StormPoint[];
};

const KT_TO_KMH = 1.852;
const ONE_MIN_TO_TEN_MIN = 0.88;

function num(s: string | undefined): number | null {
  if (s === undefined) return null;
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const round5 = (n: number) => Math.round(n / 5) * 5;

async function parseCsv(): Promise<Storm[]> {
  const rl = readline.createInterface({ input: fs.createReadStream(IBTRACS_FILE), crlfDelay: Infinity });
  let header: string[] | null = null;
  let lineNo = 0;
  const col: Record<string, number> = {};
  const storms = new Map<string, Storm>();

  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) {
      header = line.split(",");
      header.forEach((h, i) => (col[h.trim()] = i));
      continue;
    }
    if (lineNo === 2 || !header) continue; // units row
    const c = line.split(",");
    const season = Number(c[col.SEASON]);
    if (season < FIRST_SEASON) continue;
    const trackType = c[col.TRACK_TYPE].trim();
    if (!KEEP_TRACK_TYPES.has(trackType)) continue;

    const sid = c[col.SID].trim();
    let s = storms.get(sid);
    if (!s) {
      const rawName = c[col.NAME].trim();
      s = {
        sid,
        season,
        names: rawName === "UNNAMED" || rawName === "NOT_NAMED" || rawName === "" ? [] : rawName.split(":"),
        atcf: null,
        provisional: trackType !== "main",
        points: [],
      };
      storms.set(sid, s);
    }
    const atcf = c[col.USA_ATCF_ID]?.trim();
    if (!s.atcf && atcf) s.atcf = atcf;

    const lat = num(c[col.LAT]);
    let lon = num(c[col.LON]);
    if (lat === null || lon === null) continue;
    if (lon < 0) lon += 360;

    const tokyo = num(c[col.TOKYO_WIND]);
    const usa = num(c[col.USA_WIND]);
    let kmh: number | null = null;
    let est = false;
    if (tokyo !== null) {
      kmh = round5(tokyo * KT_TO_KMH);
    } else if (usa !== null) {
      kmh = round5(usa * ONE_MIN_TO_TEN_MIN * KT_TO_KMH);
      est = true;
    }
    const pres = num(c[col.TOKYO_PRES]) ?? num(c[col.USA_PRES]) ?? num(c[col.WMO_PRES]);
    const iso = c[col.ISO_TIME].trim().replace(" ", "T") + "Z";

    s.points.push({
      t: Math.round(Date.parse(iso) / 1000),
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
      kmh,
      est,
      pres,
      nature: c[col.NATURE].trim(),
      par: inPar(lon, lat),
    });
  }

  const all = [...storms.values()].filter((s) => s.points.length > 0);
  for (const s of all) s.points.sort((a, b) => a.t - b.t);
  return all.sort((a, b) => a.points[0].t - b.points[0].t);
}

/** Every 1945+ Western Pacific storm (cached after the first parse). */
export async function loadAllStorms(): Promise<Storm[]> {
  if (!fs.existsSync(IBTRACS_FILE)) throw new Error("IBTrACS CSV missing: run `npx tsx scripts/fetch-ibtracs.ts` first.");
  const csvTime = fs.statSync(IBTRACS_FILE).mtimeMs;
  if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as { v: number; csvTime: number; storms: Storm[] };
    if (cache.v === CACHE_VERSION && cache.csvTime === csvTime) return cache.storms;
  }
  const storms = await parseCsv();
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ v: CACHE_VERSION, csvTime, storms }));
  return storms;
}

export const trackEntersPar = (s: Storm) => s.points.some((p) => p.par);

/** Track comes within ~2.5° of the PAR (for matching PAGASA-named storms whose track misses the polygon). */
export const trackNearPar = (s: Storm) =>
  s.points.some((p) => p.lat >= 2.5 && p.lat <= 27.5 && p.lon >= 112.5 && p.lon <= 137.5);

/** Storms that entered the PAR: track inside the polygon, or named by PAGASA (data/pagasa-names.csv). */
export async function loadParStorms(): Promise<Storm[]> {
  const all = await loadAllStorms();
  const namesFile = path.join(DATA_DIR, "pagasa-names.csv");
  const named = new Set(
    fs.existsSync(namesFile) ? parseCsvText(fs.readFileSync(namesFile, "utf8")).map((r) => r.sid) : [],
  );
  return all.filter((s) => trackEntersPar(s) || named.has(s.sid));
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());

/** "Haiyan", "Flossie / Grace", or null when unnamed. */
export function displayName(s: Storm): string | null {
  return s.names.length ? s.names.map(titleCase).join(" / ") : null;
}

/** JTWC number like "30W" from "WP302013", or null. */
export function jtwcNumber(s: Storm): string | null {
  const m = s.atcf?.match(/^WP(\d{2})\d{4}$/);
  return m ? `${Number(m[1])}W` : null;
}
