"use client";

// Browser-side loaders for the static JSON in /public/data. Each file is fetched once per visit.
import type { DecadeTracks, ProvinceInfo, QuakesFile, TyphoonIndex } from "./types";

const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(url: string): Promise<T> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status})`);
      return res.json();
    });
    p.catch(() => cache.delete(url)); // allow a retry after a failed load
    cache.set(url, p);
  }
  return p as Promise<T>;
}

export const loadQuakes = () => loadJson<QuakesFile>("/data/quakes.json");
export const loadTyphoonIndex = () => loadJson<TyphoonIndex>("/data/typhoons/index.json");
export const loadDecadeTracks = (decade: number) => loadJson<DecadeTracks>(`/data/typhoons/tracks-${decade}.json`);
export const loadProvinceIndex = () => loadJson<ProvinceInfo[]>("/data/provinces-index.json");
