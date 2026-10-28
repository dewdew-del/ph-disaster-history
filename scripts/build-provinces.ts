// PH province boundaries (PSGC-based, faeldon/philippines-json-maps, MIT)
//   -> data/raw/provinces/provinces-detail.json  (medium detail, used by the scripts for tagging)
//   -> public/data/provinces.json                (simplified for the map, < 1 MB)
//   -> public/data/provinces-index.json          (names, regions, centers for dropdowns)
//   -> public/data/ph-outline.json               (whole-country coastline, very simplified)
// The 4 NCR districts are merged into "Metro Manila", and the City of Isabela into Basilan.
// Run: npx tsx scripts/build-provinces.ts   (add --force to re-download)
import fs from "node:fs";
import path from "node:path";
import mapshaper from "mapshaper";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { fetchWithRetry, sleep } from "./lib/http";
import { PUBLIC_DATA_DIR, RAW_DIR, checkSize, ensureDir, writeJson } from "./lib/paths";
import { slugify } from "../src/lib/format";
import type { ProvinceInfo } from "../src/lib/types";

const BASE = "https://raw.githubusercontent.com/faeldon/philippines-json-maps/HEAD/latest/geojson/regions/medres";

const REGIONS: Record<number, string> = {
  100000000: "Ilocos Region (I)",
  200000000: "Cagayan Valley (II)",
  300000000: "Central Luzon (III)",
  400000000: "CALABARZON (IV-A)",
  500000000: "Bicol Region (V)",
  600000000: "Western Visayas (VI)",
  700000000: "Central Visayas (VII)",
  800000000: "Eastern Visayas (VIII)",
  900000000: "Zamboanga Peninsula (IX)",
  1000000000: "Northern Mindanao (X)",
  1100000000: "Davao Region (XI)",
  1200000000: "SOCCSKSARGEN (XII)",
  1300000000: "National Capital Region (NCR)",
  1400000000: "Cordillera Administrative Region (CAR)",
  1600000000: "Caraga (XIII)",
  1700000000: "MIMAROPA",
  1800000000: "Negros Island Region (NIR)",
  1900000000: "BARMM",
};

type RawProps = { adm1_psgc: number; adm2_psgc: number; adm2_en: string };

/** Which display unit a raw PSGC feature belongs to. */
function unitName(p: RawProps): string {
  if (p.adm1_psgc === 1300000000) return "Metro Manila";
  if (/City of Isabela/i.test(p.adm2_en)) return "Basilan";
  if (/Special Geographic Area/i.test(p.adm2_en)) return "Special Geographic Area (BARMM)";
  return p.adm2_en.replace(/\s*\(Not a Province\)\s*/i, "").trim();
}

async function download(force: boolean): Promise<Feature<Polygon | MultiPolygon, RawProps>[]> {
  const dir = path.join(RAW_DIR, "provinces");
  ensureDir(dir);
  const features: Feature<Polygon | MultiPolygon, RawProps>[] = [];
  for (const code of Object.keys(REGIONS)) {
    const file = path.join(dir, `region-${code}.json`);
    if (force || !fs.existsSync(file)) {
      const res = await fetchWithRetry(`${BASE}/provdists-region-${code}.0.01.json`);
      fs.writeFileSync(file, await res.text());
      await sleep(200);
    }
    const fc = JSON.parse(fs.readFileSync(file, "utf8")) as FeatureCollection<Polygon | MultiPolygon, RawProps>;
    features.push(...fc.features);
  }
  return features;
}

async function main() {
  const raw = await download(process.argv.includes("--force"));
  console.log(`Downloaded ${raw.length} PSGC province/district features`);

  // Tag each feature with its display unit, then dissolve (merges NCR + Isabela).
  const tagged: FeatureCollection = {
    type: "FeatureCollection",
    features: raw.map((f) => {
      const name = unitName(f.properties);
      return {
        type: "Feature",
        geometry: f.geometry,
        properties: { slug: slugify(name), name, region: REGIONS[f.properties.adm1_psgc] ?? "" },
      };
    }),
  };

  const detailOut = await mapshaper.applyCommands(
    "-i in.json -dissolve slug copy-fields=name,region -clean -o detail.json format=geojson precision=0.0001",
    { "in.json": tagged },
  );
  const detail = JSON.parse(String(detailOut["detail.json"])) as FeatureCollection<Polygon | MultiPolygon>;

  const simpleOut = await mapshaper.applyCommands(
    "-i in.json -simplify 12% keep-shapes -o simple.json format=geojson precision=0.001",
    { "in.json": detail },
  );
  const simple = JSON.parse(String(simpleOut["simple.json"])) as FeatureCollection<Polygon | MultiPolygon>;

  // Whole-country coastline, very simplified, for small drawings (the landing page thumbnails).
  const outlineOut = await mapshaper.applyCommands(
    "-i in.json -dissolve -simplify 1.5% keep-shapes -filter-islands min-area=40km2 -o outline.json format=geojson precision=0.01",
    { "in.json": detail },
  );
  const outline = JSON.parse(String(outlineOut["outline.json"]));

  detail.features.sort((a, b) => String(a.properties?.name).localeCompare(String(b.properties?.name)));
  simple.features.sort((a, b) => String(a.properties?.name).localeCompare(String(b.properties?.name)));

  const index: ProvinceInfo[] = detail.features.map((f) => {
    const p = f.properties as { slug: string; name: string; region: string };
    const [w, s, e, n] = turf.bbox(f);
    const center = turf.pointOnFeature(f).geometry.coordinates;
    return {
      slug: p.slug,
      name: p.name,
      region: p.region,
      bbox: [round(w), round(s), round(e), round(n)],
      center: [round(center[1]), round(center[0])],
    };
  });

  const detailFile = path.join(RAW_DIR, "provinces", "provinces-detail.json");
  fs.writeFileSync(detailFile, JSON.stringify(detail));
  console.log(`Province units after merging: ${index.length}`);
  console.log(`  data/raw/provinces/provinces-detail.json: ${Math.round(fs.statSync(detailFile).size / 1024)} KB`);
  checkSize("public/data/provinces.json", writeJson(path.join(PUBLIC_DATA_DIR, "provinces.json"), simple));
  checkSize("public/data/provinces-index.json", writeJson(path.join(PUBLIC_DATA_DIR, "provinces-index.json"), index));
  checkSize("public/data/ph-outline.json", writeJson(path.join(PUBLIC_DATA_DIR, "ph-outline.json"), outline));
}

const round = (n: number) => Math.round(n * 1000) / 1000;

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
