// Downloads the IBTrACS Western Pacific CSV (~115 MB) into data/raw/ibtracs/.
// Skips the download when the file is less than 7 days old (use --force to re-download).
// Run: npx tsx scripts/fetch-ibtracs.ts
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fetchWithRetry } from "./lib/http";
import { IBTRACS_FILE, IBTRACS_URL } from "./lib/ibtracs";
import { ensureDir } from "./lib/paths";

const MAX_AGE_DAYS = 7;

async function main() {
  ensureDir(path.dirname(IBTRACS_FILE));
  const force = process.argv.includes("--force");
  if (!force && fs.existsSync(IBTRACS_FILE)) {
    const ageDays = (Date.now() - fs.statSync(IBTRACS_FILE).mtimeMs) / 86_400_000;
    if (ageDays < MAX_AGE_DAYS) {
      console.log(`IBTrACS CSV is ${ageDays.toFixed(1)} days old, keeping it (use --force to re-download).`);
      return;
    }
  }
  console.log("Downloading IBTrACS Western Pacific CSV (~115 MB)...");
  const res = await fetchWithRetry(IBTRACS_URL);
  if (!res.body) throw new Error("Empty response body");
  const tmp = `${IBTRACS_FILE}.part`;
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), fs.createWriteStream(tmp));
  fs.renameSync(tmp, IBTRACS_FILE);
  console.log(`Saved ${Math.round(fs.statSync(IBTRACS_FILE).size / 1e6)} MB to ${path.relative(process.cwd(), IBTRACS_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
