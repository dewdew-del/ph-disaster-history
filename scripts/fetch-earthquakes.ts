// USGS Earthquake Catalog -> data/raw/quakes/quakes-YYYY.json (one file per year).
// Past years are cached; the current year is always re-downloaded.
// Run: npx tsx scripts/fetch-earthquakes.ts   (add --force to re-download everything)
import fs from "node:fs";
import path from "node:path";
import { fetchJson, sleep } from "./lib/http";
import { RAW_DIR, ensureDir } from "./lib/paths";

export const QUAKE_BOX = { minlatitude: 4, maxlatitude: 21.5, minlongitude: 116, maxlongitude: 128 };
export const MIN_MAG = 4.5;
const FIRST_YEAR = 1900;

type UsgsResponse = { metadata: { count: number }; features: unknown[] };

async function main() {
  const force = process.argv.includes("--force");
  const outDir = path.join(RAW_DIR, "quakes");
  ensureDir(outDir);
  const thisYear = new Date().getUTCFullYear();
  let downloaded = 0;
  let total = 0;

  for (let year = FIRST_YEAR; year <= thisYear; year++) {
    const file = path.join(outDir, `quakes-${year}.json`);
    if (!force && year < thisYear && fs.existsSync(file)) {
      total += (JSON.parse(fs.readFileSync(file, "utf8")) as UsgsResponse).features.length;
      continue;
    }
    // endtime is exclusive at midnight of Jan 1 next year, so Dec 31 is fully included.
    const params = new URLSearchParams({
      format: "geojson",
      eventtype: "earthquake",
      orderby: "time-asc",
      minmagnitude: String(MIN_MAG),
      starttime: `${year}-01-01T00:00:00`,
      endtime: `${year + 1}-01-01T00:00:00`,
      ...Object.fromEntries(Object.entries(QUAKE_BOX).map(([k, v]) => [k, String(v)])),
    });
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`;
    const data = await fetchJson<UsgsResponse>(url);
    if (data.features.length >= 20000) {
      throw new Error(`${year}: hit the USGS 20,000 result cap; split the query into smaller ranges`);
    }
    fs.writeFileSync(file, JSON.stringify(data));
    total += data.features.length;
    downloaded++;
    process.stdout.write(`  ${year}: ${data.features.length} quakes\n`);
    await sleep(300);
  }

  console.log(`Done. Downloaded ${downloaded} year file(s); ${total} quakes in raw files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
