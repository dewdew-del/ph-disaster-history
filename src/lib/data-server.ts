// Build-time loaders (server components only): read the generated JSON in /public/data from disk.
import fs from "node:fs";
import path from "node:path";
import type { ProvinceInfo, QuakesFile, QuakesSummary, TyphoonDetail, TyphoonIndex } from "./types";

const cache = new Map<string, unknown>();

export function readPublicJson<T>(rel: string): T {
  if (!cache.has(rel)) {
    cache.set(rel, JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", rel), "utf8")));
  }
  return cache.get(rel) as T;
}

export const getTyphoonIndex = () => readPublicJson<TyphoonIndex>("data/typhoons/index.json");
export const getQuakesSummary = () => readPublicJson<QuakesSummary>("data/quakes-summary.json");
export const getQuakes = () => readPublicJson<QuakesFile>("data/quakes.json");
export const getProvinceIndex = () => readPublicJson<ProvinceInfo[]>("data/provinces-index.json");

/** Not cached: each detail page reads its own file once. */
export function getTyphoonDetail(id: string): TyphoonDetail {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "typhoons", `${id}.json`), "utf8"));
}
