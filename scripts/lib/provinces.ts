// Province lookup for the scripts: which province a point is in, or the nearest one.
import fs from "node:fs";
import path from "node:path";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { RAW_DIR } from "./paths";

export type ProvinceFeature = Feature<Polygon | MultiPolygon, { slug: string; name: string; region: string }>;

export type ProvinceLookup = {
  features: ProvinceFeature[];
  slugs: string[];
  names: string[];
  /** Index of the province containing [lon, lat], or -1. */
  containing(lon: number, lat: number): number;
  /** Nearest province (by boundary vertex) and distance in km, searching up to maxKm. */
  nearest(lon: number, lat: number, maxKm: number): { index: number; km: number } | null;
};

const CELL = 0.25; // degrees, grid cell size for the vertex index
const KM_PER_DEG = 111.32;

export function loadProvinces(): ProvinceLookup {
  const file = path.join(RAW_DIR, "provinces", "provinces-detail.json");
  if (!fs.existsSync(file)) throw new Error("Run `npx tsx scripts/build-provinces.ts` first.");
  const fc = JSON.parse(fs.readFileSync(file, "utf8")) as FeatureCollection<Polygon | MultiPolygon>;
  const features = fc.features as ProvinceFeature[];
  const bboxes = features.map((f) => turf.bbox(f));

  // Grid of boundary vertices -> province index, for fast nearest-province search.
  const grid = new Map<string, [number, number, number][]>();
  features.forEach((f, i) => {
    turf.coordEach(f, ([lon, lat]) => {
      const key = `${Math.floor(lon / CELL)},${Math.floor(lat / CELL)}`;
      let cell = grid.get(key);
      if (!cell) grid.set(key, (cell = []));
      cell.push([lon, lat, i]);
    });
  });

  function containing(lon: number, lat: number): number {
    const pt = turf.point([lon, lat]);
    for (let i = 0; i < features.length; i++) {
      const [w, s, e, n] = bboxes[i];
      if (lon < w || lon > e || lat < s || lat > n) continue;
      if (turf.booleanPointInPolygon(pt, features[i])) return i;
    }
    return -1;
  }

  function nearest(lon: number, lat: number, maxKm: number) {
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const reach = Math.ceil(maxKm / KM_PER_DEG / CELL / Math.max(cosLat, 0.5)) + 1;
    const cx = Math.floor(lon / CELL);
    const cy = Math.floor(lat / CELL);
    let best: { index: number; km: number } | null = null;
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        const cell = grid.get(`${cx + dx},${cy + dy}`);
        if (!cell) continue;
        for (const [vlon, vlat, i] of cell) {
          const km = Math.hypot((vlon - lon) * cosLat, vlat - lat) * KM_PER_DEG;
          if (km <= maxKm && (!best || km < best.km)) best = { index: i, km };
        }
      }
    }
    return best;
  }

  return {
    features,
    slugs: features.map((f) => f.properties.slug),
    names: features.map((f) => f.properties.name),
    containing,
    nearest,
  };
}
