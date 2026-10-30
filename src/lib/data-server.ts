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

export type SatellitePhoto = { file: string; date: string; source: string };

/** Satellite photos by storm id (written by scripts/fetch-satellite.ts); empty when the file is missing. */
export function getSatellitePhotos(): Record<string, SatellitePhoto> {
  const rel = "data/typhoons/satellite.json";
  return fs.existsSync(path.join(process.cwd(), "public", rel)) ? readPublicJson(rel) : {};
}

/** Not cached: each detail page reads its own file once. */
export function getTyphoonDetail(id: string): TyphoonDetail {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "typhoons", `${id}.json`), "utf8"));
}
