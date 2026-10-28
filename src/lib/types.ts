// Shared data shapes: written by the scripts in /scripts, read by the site.

// ---------- Provinces ----------

export type ProvinceInfo = {
  slug: string;
  name: string;
  region: string;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  /** [lat, lon], a point inside the province */
  center: [number, number];
};

// ---------- Earthquakes ----------

/** Where a quake is, relative to PH provinces. */
export const WHERE_LAND = 0; // inside a PH province
export const WHERE_OFFSHORE = 1; // offshore, within ~100 km of a PH province
export const WHERE_OUTSIDE = 2; // outside PH (another country, or far offshore)
export const WHERE_UNTAGGED = -1;

/** Compact quake row: [id, time (unix seconds, UTC), mag, depth km, lat, lon, place, province index, where] */
export type QuakeRow = [string, number, number, number, number, number, string, number, number];

export type QuakesFile = {
  generated: string;
  count: number;
  /** Province slugs; a row's province index points here (-1 = none). */
  provinces: string[];
  provinceNames: string[];
  rows: QuakeRow[];
};

export type Quake = {
  id: string;
  time: number;
  mag: number;
  depth: number;
  lat: number;
  lon: number;
  place: string;
  prov: number;
  where: number;
};

export type QuakeProvinceStat = {
  slug: string;
  name: string;
  count: number;
  m6: number;
  maxMag: number;
  strongestId: string | null;
};

export type QuakesSummary = {
  generated: string;
  total: number;
  m6: number;
  m7: number;
  firstYear: number;
  lastYear: number;
  outsidePh: number;
  perYear: { year: number; count: number; m6: number }[];
  bands: { band: string; count: number }[];
  strongest: Quake[];
  provinces: QuakeProvinceStat[];
};

export function toQuake(r: QuakeRow): Quake {
  return { id: r[0], time: r[1], mag: r[2], depth: r[3], lat: r[4], lon: r[5], place: r[6], prov: r[7], where: r[8] };
}

// ---------- Typhoons ----------

export type CatCode = "TD" | "TS" | "STS" | "TY" | "STY" | "UNK";

/**
 * Track point: [unix seconds UTC, lat, lon (0–360), wind km/h (10-min) or null, pressure hPa or null,
 *               category index (0 = TD … 4 = STY, -1 = unknown), estimated wind 0/1, inside PAR 0/1]
 */
export type TrackPoint = [number, number, number, number | null, number | null, number, number, number];

export type Damage = {
  /** Total deaths, all areas (Wikipedia infobox) */
  deaths: number | null;
  /** Total damage in USD as Wikipedia lists it */
  damageUsd: number | null;
  /** Year of the USD amount, e.g. 2013 for "(2013 USD)" */
  damageYear: number | null;
  rawText: string | null;
  /** The value couldn't be parsed cleanly (range, "at least", …) */
  approximate: boolean;
  sourceUrl: string | null;
  /** Curated PH-only death count (data/overrides.csv), used for the deadliest list */
  phDeaths: number | null;
  phSourceUrl: string | null;
};

export type TyphoonSummary = {
  id: string;
  season: number;
  /** International name, e.g. "Haiyan"; null when unnamed */
  name: string | null;
  /** PAGASA local name, e.g. "Yolanda" */
  local: string | null;
  /** JTWC number, e.g. "30W" */
  jtwc: string | null;
  start: number;
  end: number;
  /** Peak 10-min wind, km/h */
  kmh: number | null;
  cat: CatCode;
  /** Peak wind estimated from the JTWC 1-min wind */
  est: boolean;
  deaths: number | null;
  phDeaths: number | null;
  /** Affected province indexes (into TyphoonIndex.provinces), approximate path area */
  prov: number[];
  provisional: boolean;
  retired: boolean;
};

export type TyphoonIndex = {
  generated: string;
  count: number;
  firstSeason: number;
  lastSeason: number;
  provinces: string[];
  decades: number[];
  storms: TyphoonSummary[];
};

export type StormLink = { id: string; label: string };

export type TyphoonDetail = TyphoonSummary & {
  atcf: string | null;
  parIn: number | null;
  parOut: number | null;
  parKmh: number | null;
  parCat: CatCode;
  minPres: number | null;
  track: TrackPoint[];
  damage: Damage | null;
  /** Province slugs inside the ~50 km path buffer (approximate) */
  provinces: string[];
  wikiUrl: string | null;
  localNameSource: string | null;
  prev: StormLink | null;
  next: StormLink | null;
};

/** One row of the retired PAGASA names list. */
export type RetiredName = {
  local: string;
  intl: string | null;
  year: number;
  /** Storm page id, when the storm is in the archive */
  id: string | null;
  cat: CatCode;
  kmh: number | null;
  /** PH deaths as listed in the retired-names table */
  deathsListed: number | null;
  /** The table gives one combined count for storms that hit together */
  deathsShared: boolean;
  /** Damage in pesos as listed, e.g. "₱95480000000" */
  damagePhp: string | null;
  articleUrl: string | null;
};

/** Simplified tracks for one decade: storm id -> [lat, lon, category index][] */
export type DecadeTracks = { decade: number; storms: Record<string, [number, number, number][]> };

/** Display label like "Yolanda (Haiyan)", "Haiyan", "Unnamed 30W". */
export function stormLabel(s: Pick<TyphoonSummary, "name" | "local" | "jtwc">): string {
  if (s.local && s.name) return `${s.local} (${s.name})`;
  if (s.local) return s.local;
  if (s.name) return s.name;
  return s.jtwc ? `Unnamed ${s.jtwc}` : "Unnamed storm";
}
