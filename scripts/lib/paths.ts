import fs from "node:fs";
import path from "node:path";

// npm scripts always run from the project root.
export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const RAW_DIR = path.join(DATA_DIR, "raw");
export const PUBLIC_DATA_DIR = path.join(ROOT, "public", "data");

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/** Writes compact JSON (no spaces) and returns the size in KB, for the size check. */
export function writeJson(file: string, data: unknown): number {
  ensureDir(path.dirname(file));
  const text = JSON.stringify(data);
  fs.writeFileSync(file, text);
  return Math.round(Buffer.byteLength(text) / 1024);
}

/** Warns when a generated file goes over the ~2 MB rule from PLAN.md. */
export function checkSize(label: string, kb: number) {
  const flag = kb > 2048 ? "  <-- OVER 2 MB, split or simplify" : "";
  console.log(`  ${label}: ${kb} KB${flag}`);
}
