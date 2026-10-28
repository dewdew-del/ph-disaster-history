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
