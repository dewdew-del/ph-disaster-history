// IBTrACS PAR storms + data/pagasa-names.csv + data/damage.csv + data/affected-provinces.json
// + data/retired-names.csv, then data/overrides.csv last (manual fixes always win)
//   -> public/data/typhoons/index.json         (list for the archive page)
//   -> public/data/typhoons/{sid}.json         (full track + details per storm)
//   -> public/data/typhoons/tracks-{decade}.json (simplified tracks for the list map)
// Run: npx tsx scripts/build-typhoons.ts
import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "./lib/csv";
import { displayName, jtwcNumber, loadParStorms, type Storm, type StormPoint } from "./lib/ibtracs";
import { DATA_DIR, PUBLIC_DATA_DIR, checkSize, readJson, writeJson } from "./lib/paths";
import { simplifyIndexes } from "./lib/simplify";
import { catCodeFromIndex, catIndexFromKmh } from "../src/lib/scales";
import {
  stormLabel,
  type Damage,
  type DecadeTracks,
  type ProvinceInfo,
  type RetiredName,
  type TrackPoint,
  type TyphoonDetail,
  type TyphoonIndex,
  type TyphoonSummary,
} from "../src/lib/types";

const OUT_DIR = path.join(PUBLIC_DATA_DIR, "typhoons");

function readCsvIfExists(name: string): Record<string, string>[] {
  const file = path.join(DATA_DIR, name);
  return fs.existsSync(file) ? parseCsv(fs.readFileSync(file, "utf8")) : [];
}

const numOrNull = (s: string | undefined) => {
  if (s === undefined || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const strOrNull = (s: string | undefined) => (s && s.trim() !== "" ? s.trim() : null);
const isTrue = (s: string | undefined) => /^(1|true|yes)$/i.test(s?.trim() ?? "");

/** Keep 6-hourly synoptic points (plus first, last and the peak) to keep files small. */
function thinPoints(points: StormPoint[]): StormPoint[] {
  const peak = points.reduce<StormPoint | null>((best, p) => (p.kmh !== null && (!best || p.kmh > (best.kmh ?? -1)) ? p : best), null);
  return points.filter((p, i) => {
    const hour = new Date(p.t * 1000).getUTCHours();
    return i === 0 || i === points.length - 1 || hour % 6 === 0 || p === peak;
  });
}

function trackPoint(p: StormPoint): TrackPoint {
  return [p.t, p.lat, p.lon, p.kmh, p.pres, catIndexFromKmh(p.kmh), p.est ? 1 : 0, p.par ? 1 : 0];
}

/** Simplified [lat, lon, cat] track for the list map: simplify each same-category run on its own. */
function overviewTrack(points: StormPoint[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  let run: StormPoint[] = [];
  const flush = () => {
    if (!run.length) return;
    const xy = run.map((p) => [p.lon, p.lat]);
    for (const i of simplifyIndexes(xy, 0.12)) {
      const p = run[i];
      const pt: [number, number, number] = [round1(p.lat), round1(p.lon), catIndexFromKmh(p.kmh)];
      const last = out[out.length - 1];
      if (!last || last[0] !== pt[0] || last[1] !== pt[1]) out.push(pt);
    }
  };
  for (const p of points) {
    if (run.length && catIndexFromKmh(p.kmh) !== catIndexFromKmh(run[run.length - 1].kmh)) {
      const boundary = run[run.length - 1];
      flush();
      run = [boundary]; // share the boundary point so the colored segments connect
    }
    run.push(p);
  }
  flush();
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function maxWind(points: StormPoint[]): { kmh: number | null; est: boolean } {
  let best: StormPoint | null = null;
  for (const p of points) if (p.kmh !== null && (!best || p.kmh > (best.kmh ?? -1))) best = p;
  return { kmh: best?.kmh ?? null, est: best?.est ?? false };
}

async function main() {
  const storms = await loadParStorms();
  const generated = new Date().toISOString().slice(0, 10);

  // ---- joins (all optional; each later step adds one) ----
  const localNames = new Map(readCsvIfExists("pagasa-names.csv").map((r) => [r.sid, r]));
  const damageRows = new Map(readCsvIfExists("damage.csv").map((r) => [r.sid, r]));
  const retiredRows = readCsvIfExists("retired-names.csv");
  const retiredSids = new Set(retiredRows.map((r) => r.sid).filter(Boolean));
  const affectedFile = path.join(DATA_DIR, "affected-provinces.json");
  const affected: Record<string, string[]> = fs.existsSync(affectedFile) ? readJson(affectedFile) : {};
  const overrides = new Map<string, Map<string, string>>();
  for (const r of readCsvIfExists("overrides.csv")) {
    if (!r.sid || !r.field) continue;
    if (!overrides.has(r.sid)) overrides.set(r.sid, new Map());
    overrides.get(r.sid)!.set(r.field.trim(), r.value ?? "");
  }
  const provinceIndex = readJson<ProvinceInfo[]>(path.join(PUBLIC_DATA_DIR, "provinces-index.json"));
  const provSlugs = provinceIndex.map((p) => p.slug);
  const provPos = new Map(provSlugs.map((s, i) => [s, i]));

  const unknownOverride = [...overrides.keys()].filter((sid) => !storms.some((s) => s.sid === sid));
  if (unknownOverride.length) console.warn(`  overrides.csv: unknown sid(s) ${unknownOverride.join(", ")}`);

  const details: TyphoonDetail[] = storms.map((s: Storm) => {
    const ov = overrides.get(s.sid) ?? new Map<string, string>();
    const get = (field: string, fallback: string | null | undefined) => (ov.has(field) ? ov.get(field) : (fallback ?? undefined));

    const peak = maxWind(s.points);
    const parPoints = s.points.filter((p) => p.par);
    const parPeak = maxWind(parPoints);
    const pressures = s.points.map((p) => p.pres).filter((p): p is number => p !== null);

    const nameRow = localNames.get(s.sid);
    const local = strOrNull(get("local_name", nameRow?.pagasa_name));
    const d = damageRows.get(s.sid);
    const damage: Damage = {
      deaths: numOrNull(get("deaths", d?.deaths)),
      damageUsd: numOrNull(get("damage_usd", d?.damage_usd)),
      damageYear: numOrNull(get("damage_year", d?.damage_year)),
      rawText: strOrNull(d?.raw_text),
      approximate: isTrue(get("needs_review", d?.needs_review)),
      sourceUrl: strOrNull(get("source_url", d?.source_url)),
      phDeaths: numOrNull(get("ph_deaths", undefined)),
      phSourceUrl: strOrNull(get("ph_source_url", undefined)),
    };
    const hasDamage = damage.deaths !== null || damage.damageUsd !== null || damage.phDeaths !== null;
    const provinces = (affected[s.sid] ?? []).filter((slug) => provPos.has(slug));

    return {
      id: s.sid,
      season: s.season,
      name: displayName(s),
      local,
      jtwc: jtwcNumber(s),
      start: s.points[0].t,
      end: s.points[s.points.length - 1].t,
      kmh: peak.kmh,
      cat: catCodeFromIndex(catIndexFromKmh(peak.kmh)),
      est: peak.est,
      deaths: damage.deaths,
      phDeaths: damage.phDeaths,
      prov: provinces.map((slug) => provPos.get(slug)!),
      provisional: s.provisional,
      retired: retiredSids.has(s.sid),
      atcf: s.atcf,
      parIn: parPoints[0]?.t ?? null,
      parOut: parPoints[parPoints.length - 1]?.t ?? null,
      parKmh: parPeak.kmh,
      parCat: catCodeFromIndex(catIndexFromKmh(parPeak.kmh)),
      minPres: pressures.length ? Math.min(...pressures) : null,
      track: thinPoints(s.points).map(trackPoint),
      damage: hasDamage ? damage : null,
      provinces,
      wikiUrl: strOrNull(get("wiki_url", d?.source_url ?? nameRow?.source_url)),
      localNameSource: strOrNull(nameRow?.source_url),
      prev: null,
      next: null,
    };
  });

  details.forEach((d, i) => {
    const link = (x?: TyphoonDetail) => (x ? { id: x.id, label: `${stormLabel(x)}, ${x.season}` } : null);
    d.prev = link(details[i - 1]);
    d.next = link(details[i + 1]);
  });

  // ---- write ----
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  let biggest = 0;
  for (const d of details) biggest = Math.max(biggest, writeJson(path.join(OUT_DIR, `${d.id}.json`), d));

  const summaries: TyphoonSummary[] = details.map((d) => ({
    id: d.id,
    season: d.season,
    name: d.name,
    local: d.local,
    jtwc: d.jtwc,
    start: d.start,
    end: d.end,
    kmh: d.kmh,
    cat: d.cat,
    est: d.est,
    deaths: d.deaths,
    phDeaths: d.phDeaths,
    prov: d.prov,
    provisional: d.provisional,
    retired: d.retired,
  }));

  const decades = new Map<number, DecadeTracks>();
  for (const s of storms) {
    const decade = Math.floor(s.season / 10) * 10;
    if (!decades.has(decade)) decades.set(decade, { decade, storms: {} });
    decades.get(decade)!.storms[s.sid] = overviewTrack(thinPoints(s.points));
  }
  for (const [decade, tracks] of decades) {
    checkSize(`typhoons/tracks-${decade}.json`, writeJson(path.join(OUT_DIR, `tracks-${decade}.json`), tracks));
  }

  const index: TyphoonIndex = {
    generated,
    count: summaries.length,
    firstSeason: Math.min(...summaries.map((s) => s.season)),
    lastSeason: Math.max(...summaries.map((s) => s.season)),
    provinces: provSlugs,
    decades: [...decades.keys()].sort((a, b) => a - b),
    storms: summaries,
  };
  checkSize("typhoons/index.json", writeJson(path.join(OUT_DIR, "index.json"), index));
  console.log(`  ${details.length} storm files (largest ${biggest} KB)`);

  const byId = new Map(details.map((d) => [d.id, d]));
  const retired: RetiredName[] = retiredRows
    .map((r) => {
      const d = r.sid ? byId.get(r.sid) : undefined;
      return {
        local: r.pagasa_name,
        intl: strOrNull(r.intl_name),
        year: d?.season ?? numOrNull(r.year) ?? 0,
        id: d?.id ?? null,
        cat: d?.cat ?? "UNK",
        kmh: d?.kmh ?? null,
        deathsListed: numOrNull(r.deaths_listed),
        deathsShared: isTrue(r.deaths_ambiguous),
        damagePhp: strOrNull(r.damage_php),
        articleUrl: strOrNull(r.article_url),
      };
    })
    .sort((a, b) => a.year - b.year || a.local.localeCompare(b.local));
  checkSize("typhoons/retired.json", writeJson(path.join(OUT_DIR, "retired.json"), retired));

  const byCat = summaries.reduce<Record<string, number>>((m, s) => ((m[s.cat] = (m[s.cat] ?? 0) + 1), m), {});
  console.log(`Storms that entered PAR since ${index.firstSeason}: ${summaries.length}`, byCat);
  console.log(
    `  with local name: ${summaries.filter((s) => s.local).length}, with damage data: ${details.filter((d) => d.damage).length}, with provinces: ${summaries.filter((s) => s.prov.length).length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
