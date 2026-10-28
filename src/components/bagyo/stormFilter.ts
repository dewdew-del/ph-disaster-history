import type { CatCode, TyphoonSummary } from "@/lib/types";

export const ALL_CATS: CatCode[] = ["TD", "TS", "STS", "TY", "STY", "UNK"];

export type StormFilter = {
  q: string;
  decade: number | "all";
  year: number | "all";
  cats: CatCode[];
  /** Province slug, or "" for any */
  province: string;
};

export function defaultStormFilter(latestDecade: number): StormFilter {
  return { q: "", decade: latestDecade, year: "all", cats: [...ALL_CATS], province: "" };
}

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Search ignores the decade/year filters, so "Yolanda" is found from any decade. */
export function applyStormFilter(storms: TyphoonSummary[], f: StormFilter, provinceIndex: number): TyphoonSummary[] {
  const q = normalize(f.q);
  const cats = new Set(f.cats);
  return storms.filter((s) => {
    if (!cats.has(s.cat)) return false;
    if (provinceIndex >= 0 && !s.prov.includes(provinceIndex)) return false;
    if (q) {
      const hay = normalize(`${s.local ?? ""} ${s.name ?? ""} ${s.jtwc ?? ""} ${s.season}`);
      return q.split(/\s+/).every((w) => hay.includes(w));
    }
    if (f.decade !== "all" && Math.floor(s.season / 10) * 10 !== f.decade) return false;
    if (f.year !== "all" && s.season !== f.year) return false;
    return true;
  });
}
