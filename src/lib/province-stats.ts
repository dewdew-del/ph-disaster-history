// Build-time stats per province, shared by /lugar and /lugar/[province] (server components only).
import { getQuakes, getTyphoonIndex } from "./data-server";
import { WHERE_OUTSIDE, toQuake, type Quake, type QuakeRow, type TyphoonSummary } from "./types";

export type ProvinceCounts = { quakes: number; m6: number; storms: number };

let countsCache: Record<string, ProvinceCounts> | null = null;

export function provinceCounts(): Record<string, ProvinceCounts> {
  if (countsCache) return countsCache;
  const quakes = getQuakes();
  const typhoons = getTyphoonIndex();
  const out: Record<string, ProvinceCounts> = {};
  const get = (slug: string) => (out[slug] ??= { quakes: 0, m6: 0, storms: 0 });
  for (const r of quakes.rows) {
    if (r[7] < 0 || r[8] === WHERE_OUTSIDE) continue;
    const c = get(quakes.provinces[r[7]]);
    c.quakes++;
    if (r[2] >= 6) c.m6++;
  }
  for (const s of typhoons.storms) for (const i of s.prov) get(typhoons.provinces[i]).storms++;
  countsCache = out;
  return out;
}

export function provinceQuakeRows(slug: string): QuakeRow[] {
  const quakes = getQuakes();
  const idx = quakes.provinces.indexOf(slug);
  return quakes.rows.filter((r) => r[7] === idx && r[8] !== WHERE_OUTSIDE);
}

export function provinceQuakes(slug: string): Quake[] {
  return provinceQuakeRows(slug).map(toQuake);
}

export function provinceStorms(slug: string): TyphoonSummary[] {
  const t = getTyphoonIndex();
  const idx = t.provinces.indexOf(slug);
  return idx < 0 ? [] : t.storms.filter((s) => s.prov.includes(idx));
}
