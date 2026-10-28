import { depthKey, type DepthKey } from "@/lib/scales";
import type { Quake } from "@/lib/types";

export type QuakeWithYear = Quake & { year: number };

export type QuakeFilter = {
  magMin: number;
  magMax: number;
  yearFrom: number;
  yearTo: number;
  depths: Record<DepthKey, boolean>;
};

export const MAG_LIMITS = { min: 4.5, max: 9 };

export function defaultFilter(firstYear: number, lastYear: number): QuakeFilter {
  return {
    magMin: MAG_LIMITS.min,
    magMax: MAG_LIMITS.max,
    yearFrom: firstYear,
    yearTo: lastYear,
    depths: { shallow: true, intermediate: true, deep: true },
  };
}

export function applyFilter(quakes: QuakeWithYear[], f: QuakeFilter): QuakeWithYear[] {
  return quakes.filter(
    (q) =>
      q.mag >= f.magMin &&
      q.mag <= f.magMax &&
      q.year >= f.yearFrom &&
      q.year <= f.yearTo &&
      f.depths[depthKey(q.depth)],
  );
}
