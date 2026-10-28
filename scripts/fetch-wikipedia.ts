// Wikipedia (MediaWiki API, no HTML scraping) ->
//   data/pagasa-names.csv   sid, intl_name, pagasa_name, year, source_url, match
//   data/damage.csv         sid, deaths, damage_usd, damage_year, raw_text, needs_review, source_url
//   data/retired-names.csv  pagasa_name, intl_name, year, sid, deaths_listed, damage_php, article_url, source_url
// Raw API responses are cached in data/raw/wikipedia/ (use --force to re-download).
// Run: npx tsx scripts/fetch-wikipedia.ts
import fs from "node:fs";
import path from "node:path";
import { toCsv } from "./lib/csv";
import { fetchJson, sleep } from "./lib/http";
import { loadAllStorms, trackEntersPar, trackNearPar, type Storm } from "./lib/ibtracs";
import { DATA_DIR, RAW_DIR, ensureDir } from "./lib/paths";
import {
  nameKey,
  parseDamage,
  parseDayMonth,
  parseDeaths,
  parseInfobox,
  parsePagasaNames,
  parseRetiredTables,
  parseSeasonSections,
  stripWikitext,
  type SeasonSection,
} from "./lib/wiki";

const API = "https://en.wikipedia.org/w/api.php";
const CACHE_DIR = path.join(RAW_DIR, "wikipedia");
const FIRST_NAME_SEASON = 1990;
const RETIRED_PAGE = "List of retired Philippine typhoon names";
const force = process.argv.includes("--force");

const wikiUrl = (title: string, anchor?: string) =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}${anchor ? `#${encodeURIComponent(anchor.replace(/ /g, "_"))}` : ""}`;

type ApiResponse = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[];
  };
};

type Page = { title: string; wikitext: string };

const cacheFile = (title: string) => path.join(CACHE_DIR, `${title.replace(/[^A-Za-z0-9()_-]+/g, "_").slice(0, 120)}.json`);

/** Fetches wikitext for up to 20 titles per request (1 s apart), following redirects. Cached. */
async function getPages(titles: string[]): Promise<Map<string, Page | null>> {
  ensureDir(CACHE_DIR);
  const result = new Map<string, Page | null>();
  const todo: string[] = [];
  for (const t of new Set(titles)) {
    const f = cacheFile(t);
    if (!force && fs.existsSync(f)) result.set(t, JSON.parse(fs.readFileSync(f, "utf8")) as Page | null);
    else todo.push(t);
  }
  for (let i = 0; i < todo.length; i += 20) {
    const batch = todo.slice(i, i + 20);
    const params = new URLSearchParams({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      redirects: "1",
      format: "json",
      formatversion: "2",
      maxlag: "5",
      titles: batch.join("|"),
    });
    const data = await fetchJson<ApiResponse>(`${API}?${params}`);
    const q = data.query;
    const resolve = new Map<string, string>();
    for (const t of batch) {
      let cur = t;
      const n = q?.normalized?.find((x) => x.from === cur);
      if (n) cur = n.to;
      const r = q?.redirects?.find((x) => x.from === cur);
      if (r) cur = r.to;
      resolve.set(t, cur);
    }
    for (const t of batch) {
      const page = q?.pages.find((p) => p.title === resolve.get(t));
      const content = page?.revisions?.[0]?.slots.main.content;
      const value: Page | null = page && !page.missing && content ? { title: page.title, wikitext: content } : null;
      fs.writeFileSync(cacheFile(t), JSON.stringify(value));
      result.set(t, value);
    }
    process.stdout.write(`  fetched ${Math.min(i + 20, todo.length)}/${todo.length} pages\r`);
    await sleep(1000);
  }
  if (todo.length) process.stdout.write("\n");
  return result;
}

// ---------- matching ----------

type Match = { storm: Storm; method: "name" | "jtwc" | "dates" };

function overlaps(s: Storm, from: number | null, to: number | null): boolean {
  if (from === null) return false;
  const end = (to ?? from) + 86400 * 2;
  const start = from - 86400 * 2;
  return s.points[0].t <= end && s.points[s.points.length - 1].t >= start;
}

function distanceToWindow(s: Storm, from: number | null): number {
  return from === null ? 0 : Math.abs(s.points[0].t - from);
}

function matchSection(sec: SeasonSection, season: number, candidates: Storm[]): Match | null {
  const from = parseDayMonth(sec.formed, season);
  const to = parseDayMonth(sec.dissipated, season);
  if (sec.intl) {
    const key = nameKey(sec.intl);
    const byName = candidates.filter((s) => s.names.some((n) => nameKey(n) === key));
    if (byName.length === 1) return { storm: byName[0], method: "name" };
    if (byName.length > 1) {
      const best = [...byName].sort((a, b) => distanceToWindow(a, from) - distanceToWindow(b, from))[0];
      return { storm: best, method: "name" };
    }
  }
  if (sec.jtwc) {
    const atcf = `WP${sec.jtwc.replace("W", "").padStart(2, "0")}${season}`;
    const byNum = candidates.find((s) => s.atcf === atcf);
    if (byNum) return { storm: byNum, method: "jtwc" };
  }
  if (!sec.intl && sec.local) {
    // PAGASA-only depression: accept a date match only when exactly one unnamed storm fits.
    const byDate = candidates.filter((s) => s.names.length === 0 && overlaps(s, from, to));
    if (byDate.length === 1) return { storm: byDate[0], method: "dates" };
  }
  return null;
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());

/** Keeps the local name only if it's on that season's PAGASA list; otherwise it was a JTWC/JMA name. */
function validateLocal(sec: SeasonSection, pagasaNames: Set<string> | null): SeasonSection {
  if (!sec.local || !pagasaNames) return sec;
  const first = sec.local.split(/\s*[–/]\s*/)[0];
  if (pagasaNames.has(nameKey(first))) return sec;
  // "Tropical Depression Jack" (1993): Jack isn't a PAGASA name, so it's the international name.
  return { ...sec, intl: sec.intl ?? sec.local, local: null };
}

async function main() {
  const allStorms = await loadAllStorms();
  // Match against PAR storms first; PAGASA-named storms whose track just misses the polygon come second.
  const storms = allStorms.filter((s) => trackEntersPar(s) || trackNearPar(s));
  const bySeason = new Map<number, Storm[]>();
  for (const s of storms) {
    if (!bySeason.has(s.season)) bySeason.set(s.season, []);
    bySeason.get(s.season)!.push(s);
  }
  const thisYear = new Date().getUTCFullYear();

  // ---- 1. Local names from the season pages ----
  const seasonTitles: string[] = [];
  for (let y = FIRST_NAME_SEASON; y <= thisYear; y++) seasonTitles.push(`${y} Pacific typhoon season`);
  console.log(`Season pages: ${seasonTitles.length}`);
  const seasonPages = await getPages(seasonTitles);

  const nameRows: Record<string, unknown>[] = [];
  const articleFor = new Map<string, string>(); // sid -> storm article title
  const used = new Set<string>();
  const unmatched: string[] = [];
  let sectionsWithLocal = 0;

  for (let y = FIRST_NAME_SEASON; y <= thisYear; y++) {
    const page = seasonPages.get(`${y} Pacific typhoon season`);
    if (!page) {
      console.warn(`  missing season page for ${y}`);
      continue;
    }
    const candidates = bySeason.get(y) ?? [];
    const pagasaNames = parsePagasaNames(page.wikitext);
    for (const raw of parseSeasonSections(page.wikitext)) {
      const sec = validateLocal(raw, pagasaNames);
      if (sec.local) sectionsWithLocal++;
      const free = candidates.filter((s) => !used.has(s.sid));
      // A storm without a PAGASA name must have a track inside the PAR to be matched.
      const m =
        matchSection(sec, y, free.filter(trackEntersPar)) ?? (sec.local ? matchSection(sec, y, free) : null);
      if (!m) {
        if (sec.local) unmatched.push(`${y}: ${sec.heading}`);
        continue;
      }
      used.add(m.storm.sid);
      if (sec.mainArticle) articleFor.set(m.storm.sid, sec.mainArticle);
      if (!sec.local) continue;
      nameRows.push({
        sid: m.storm.sid,
        intl_name: sec.intl ?? "",
        pagasa_name: titleCase(sec.local),
        year: y,
        source_url: wikiUrl(page.title, sec.heading),
        match: m.method,
      });
    }
  }

  // ---- 2. Retired names list (also covers pre-1990 retired storms) ----
  const retiredPage = (await getPages([RETIRED_PAGE])).get(RETIRED_PAGE);
  const retiredRows: Record<string, unknown>[] = [];
  const localFromRetired = new Map<string, string>();
  if (retiredPage) {
    for (const r of parseRetiredTables(retiredPage.wikitext)) {
      if (!/^[A-Z][a-z]+$/.test(r.local)) continue; // footnote rows like "24 Names"
      // Some rows give the year the name was retired, so look one year either side.
      const year = r.year ?? 0;
      const candidates = [year, year - 1, year + 1].flatMap((y) => bySeason.get(y) ?? []);
      const from = r.startDate ? Date.UTC(+r.startDate.slice(0, 4), +r.startDate.slice(4, 6) - 1, +r.startDate.slice(6, 8)) / 1000 : null;
      let storm: Storm | undefined;
      if (r.intl) {
        const key = nameKey(r.intl);
        storm = candidates
          .filter((s) => s.names.some((n) => nameKey(n) === key))
          .sort((a, b) => Math.abs(a.season - year) - Math.abs(b.season - year) || distanceToWindow(a, from) - distanceToWindow(b, from))[0];
      } else if (from !== null) {
        // No international name (a PAGASA-only depression): accept a single unnamed storm on those dates.
        const byDate = candidates.filter((s) => s.names.length === 0 && overlaps(s, from, from));
        if (byDate.length === 1) storm = byDate[0];
      }
      if (storm && r.article && !articleFor.has(storm.sid)) articleFor.set(storm.sid, r.article);
      if (storm) localFromRetired.set(storm.sid, titleCase(r.local));
      retiredRows.push({
        pagasa_name: titleCase(r.local),
        intl_name: r.intl ?? "",
        year: r.year ?? "",
        sid: storm?.sid ?? "",
        deaths_listed: parseDeaths(r.deathsRaw).value ?? "",
        damage_php: r.damagePhpRaw ? stripWikitext(r.damagePhpRaw) : "",
        article_url: r.article ? wikiUrl(r.article) : "",
        source_url: wikiUrl(RETIRED_PAGE),
      });
    }
  } else {
    console.warn("  could not load the retired names page");
  }

  // Retired storms before 1990 get their local name from the retired list (it is sourced there).
  const named = new Set(nameRows.map((r) => r.sid));
  for (const [sid, local] of localFromRetired) {
    if (named.has(sid)) continue;
    const s = storms.find((x) => x.sid === sid)!;
    nameRows.push({
      sid,
      intl_name: s.names.map(titleCase).join(" / "),
      pagasa_name: local,
      year: s.season,
      source_url: wikiUrl(RETIRED_PAGE),
      match: "retired-list",
    });
  }

  // ---- 3. Damage + deaths from each storm's own article ----
  const articleTitles = [...new Set(articleFor.values())];
  console.log(`Storm articles: ${articleTitles.length}`);
  const articles = await getPages(articleTitles);
  const damageRows: Record<string, unknown>[] = [];
  for (const [sid, title] of articleFor) {
    const page = articles.get(title);
    if (!page) continue;
    // Some old storm links redirect to the whole season page: its infobox has season totals, not this storm's.
    if (/typhoon season|cyclone season|hurricane season/i.test(page.title)) continue;
    const box = parseInfobox(page.wikitext);
    if (!box) continue;
    const deaths = parseDeaths(box.fatalities);
    const damage = parseDamage(box.damage, box.damagePrefix);
    if (deaths.value === null && damage.value === null && !box.fatalities && !box.damage) continue;
    const storm = storms.find((s) => s.sid === sid)!;
    const raw = [
      box.fatalities ? `fatalities: ${stripWikitext(box.fatalities)}` : "",
      box.damage ? `damages: ${box.damagePrefix ? stripWikitext(box.damagePrefix) + " " : ""}${stripWikitext(box.damage)}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    damageRows.push({
      sid,
      deaths: deaths.value ?? "",
      damage_usd: damage.value ?? "",
      damage_year: damage.value !== null ? (damage.year ?? box.year ?? storm.season) : "",
      raw_text: raw,
      needs_review: deaths.needsReview || damage.needsReview ? "true" : "false",
      source_url: wikiUrl(page.title),
    });
  }

  // ---- write ----
  const sortBySid = (a: Record<string, unknown>, b: Record<string, unknown>) => String(a.sid).localeCompare(String(b.sid));
  fs.writeFileSync(
    path.join(DATA_DIR, "pagasa-names.csv"),
    toCsv(["sid", "intl_name", "pagasa_name", "year", "source_url", "match"], nameRows.sort(sortBySid)),
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "damage.csv"),
    toCsv(["sid", "deaths", "damage_usd", "damage_year", "raw_text", "needs_review", "source_url"], damageRows.sort(sortBySid)),
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "retired-names.csv"),
    toCsv(["pagasa_name", "intl_name", "year", "sid", "deaths_listed", "damage_php", "article_url", "source_url"], retiredRows),
  );
  fs.writeFileSync(path.join(RAW_DIR, "wikipedia-unmatched.txt"), unmatched.join("\n") + "\n");

  const review = damageRows.filter((r) => r.needs_review === "true").length;
  console.log("Summary");
  console.log(`  local names: ${nameRows.length} storms (season sections with a local name: ${sectionsWithLocal}, unmatched: ${unmatched.length})`);
  console.log(`  damage/deaths: ${damageRows.length} storms (${review} need review)`);
  console.log(`  retired names: ${retiredRows.length} (${retiredRows.filter((r) => r.sid).length} matched to a storm)`);
  console.log(`  unmatched list: data/raw/wikipedia-unmatched.txt`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
