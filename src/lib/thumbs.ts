// Small SVG drawings for the landing page's contact sheet, made at build time from our own data.
// All thumbnails share one frame (lon 114–132°E, lat 3–23°N) so they line up like a contact sheet.
import type { FeatureCollection, GeometryCollection, MultiPolygon, Polygon } from "geojson";
import { readPublicJson } from "./data-server";
import type { TrackPoint } from "./types";

export const FRAME = { west: 114, east: 132, south: 3, north: 23 };
const COS = Math.cos((13 * Math.PI) / 180);
export const THUMB_W = 140;
export const THUMB_H = Math.round((THUMB_W * (FRAME.north - FRAME.south)) / ((FRAME.east - FRAME.west) * COS));

export function project(lat: number, lon: number): [number, number] {
  const x = ((lon - FRAME.west) / (FRAME.east - FRAME.west)) * THUMB_W;
  const y = ((FRAME.north - lat) / (FRAME.north - FRAME.south)) * THUMB_H;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

let outlineCache: string | null = null;

/** The country's coastline as one SVG path (d attribute). */
export function outlinePath(): string {
  if (outlineCache) return outlineCache;
  // mapshaper writes a GeometryCollection after a plain dissolve; accept a FeatureCollection too.
  const gj = readPublicJson<FeatureCollection<Polygon | MultiPolygon> | GeometryCollection<Polygon | MultiPolygon>>(
    "data/ph-outline.json",
  );
  const geometries = gj.type === "FeatureCollection" ? gj.features.map((f) => f.geometry) : gj.geometries;
  const parts: string[] = [];
  for (const g of geometries) {
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const poly of polys) {
      const ring = poly[0];
      parts.push(ring.map(([lon, lat], i) => `${i ? "L" : "M"}${project(lat, lon).join(" ")}`).join("") + "Z");
    }
  }
  outlineCache = parts.join("");
  return outlineCache;
}

/** Track as same-category runs: [{ d, cat }] (cat 0–4, -1 unknown). */
export function trackRuns(track: TrackPoint[]): { d: string; cat: number }[] {
  const runs: { pts: [number, number][]; cat: number }[] = [];
  for (let i = 0; i < track.length - 1; i++) {
    const cat = Math.max(track[i][5], track[i + 1][5]);
    const a = project(track[i][1], track[i][2]);
    const b = project(track[i + 1][1], track[i + 1][2]);
    const last = runs[runs.length - 1];
    if (last && last.cat === cat) last.pts.push(b);
    else runs.push({ pts: [a, b], cat });
  }
  return runs.map((r) => ({ cat: r.cat, d: r.pts.map((p, i) => `${i ? "L" : "M"}${p.join(" ")}`).join("") }));
}

/** Wind over time as an area path in a w x h box (0 at the bottom, 260 km/h at the top). */
export function windArea(track: TrackPoint[], w: number, h: number): { area: string; line: string } {
  const pts = track.filter((p) => p[3] !== null);
  if (pts.length < 2) return { area: "", line: "" };
  const t0 = pts[0][0];
  const t1 = pts[pts.length - 1][0];
  const xy = pts.map((p) => [((p[0] - t0) / (t1 - t0)) * w, h - (Math.min(p[3]!, 260) / 260) * h] as [number, number]);
  const line = xy.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  return { line, area: `${line}L${w} ${h}L0 ${h}Z` };
}
