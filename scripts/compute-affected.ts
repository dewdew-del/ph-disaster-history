// Track x provinces -> data/affected-provinces.json  { sid: [province slugs] }
// A province is in a storm's "approximate path area" when the track passes within ~50 km of it
// (or runs through it). Uses the full 3-hourly IBTrACS track. Not an official list of affected areas.
// Needs public/data/provinces.json (build-provinces.ts) and the IBTrACS cache.
// Run: npx tsx scripts/compute-affected.ts
import fs from "node:fs";
import path from "node:path";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { loadParStorms } from "./lib/ibtracs";
import { DATA_DIR, PUBLIC_DATA_DIR } from "./lib/paths";

const BUFFER_KM = 50;
const KM_PER_DEG = 111.32;
const PAD_DEG = 0.6; // bbox padding, a bit more than 50 km

type Prov = {
  slug: string;
  feature: Feature<Polygon | MultiPolygon>;
  bbox: [number, number, number, number];
  vertices: [number, number][];
};

function loadProvinces(): Prov[] {
  const fc = JSON.parse(fs.readFileSync(path.join(PUBLIC_DATA_DIR, "provinces.json"), "utf8")) as FeatureCollection<
    Polygon | MultiPolygon
  >;
  return fc.features.map((f) => {
    const vertices: [number, number][] = [];
    turf.coordEach(f, (c) => vertices.push([c[0], c[1]]));
    return {
      slug: String(f.properties?.slug),
      feature: f as Feature<Polygon | MultiPolygon>,
      bbox: turf.bbox(f) as [number, number, number, number],
      vertices,
    };
  });
}

/** Distance in km from point p to segment a-b, in a local flat projection (fine at these scales). */
function segDistKm(p: [number, number], a: [number, number], b: [number, number]): number {
  const cos = Math.cos((p[1] * Math.PI) / 180);
  const ax = (a[0] - p[0]) * cos;
  const ay = a[1] - p[1];
  const bx = (b[0] - p[0]) * cos;
  const by = b[1] - p[1];
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy) * KM_PER_DEG;
}

async function main() {
  const provinces = loadProvinces();
  const storms = await loadParStorms();
  const out: Record<string, string[]> = {};
  let withAny = 0;

  for (const s of storms) {
    const pts = s.points.map((p) => [p.lon, p.lat] as [number, number]);
    if (pts.length === 0) continue;
    const hits: string[] = [];
    for (const prov of provinces) {
      const [w, so, e, n] = prov.bbox;
      // Segments that come anywhere near this province's (padded) bbox.
      const segs: [[number, number], [number, number]][] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[Math.min(i + 1, pts.length - 1)];
        if (Math.max(a[0], b[0]) < w - PAD_DEG || Math.min(a[0], b[0]) > e + PAD_DEG) continue;
        if (Math.max(a[1], b[1]) < so - PAD_DEG || Math.min(a[1], b[1]) > n + PAD_DEG) continue;
        segs.push([a, b]);
      }
      if (segs.length === 0) continue;
      let hit = segs.some(([a]) => turf.booleanPointInPolygon(a, prov.feature));
      for (let v = 0; !hit && v < prov.vertices.length; v++) {
        const vert = prov.vertices[v];
        for (const [a, b] of segs) {
          if (segDistKm(vert, a, b) <= BUFFER_KM) {
            hit = true;
            break;
          }
        }
      }
      if (hit) hits.push(prov.slug);
    }
    if (hits.length) {
      out[s.sid] = hits;
      withAny++;
    }
  }

  fs.writeFileSync(path.join(DATA_DIR, "affected-provinces.json"), JSON.stringify(out, null, 0));
  const counts = new Map<string, number>();
  for (const list of Object.values(out)) for (const slug of list) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`Storms with a path area over at least one province: ${withAny} of ${storms.length}`);
  console.log(`  most often in a path area: ${top.map(([s, n]) => `${s} ${n}`).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
