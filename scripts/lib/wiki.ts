// Pure wikitext helpers for fetch-wikipedia.ts (no network). Tested in wiki.test.ts.

/** Removes every {{template}} whose name matches `test` (handles nesting). */
export function removeTemplates(s: string, test: (name: string) => boolean): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s.startsWith("{{", i)) {
      const end = matchingBraces(s, i);
      const inner = s.slice(i + 2, end - 2);
      const name = inner.split("|")[0].trim().toLowerCase();
      if (test(name)) {
        i = end;
        continue;
      }
      out += "{{" + removeTemplates(inner, test) + "}}";
      i = end;
      continue;
    }
    out += s[i];
    i++;
  }
  return out;
}

/** Index just past the `}}` that closes the `{{` at `start`. */
function matchingBraces(s: string, start: number): number {
  let depth = 0;
  for (let i = start; i < s.length - 1; i++) {
    if (s[i] === "{" && s[i + 1] === "{") {
      depth++;
      i++;
    } else if (s[i] === "}" && s[i + 1] === "}") {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  return s.length;
}

/** Splits template params on top-level pipes: "a|b{{c|d}}|e" -> ["a", "b{{c|d}}", "e"]. */
export function splitParams(inner: string): string[] {
  const out: string[] = [];
  let depthT = 0;
  let depthL = 0;
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === "{{" || two === "}}" || two === "[[" || two === "]]") {
      if (two === "{{") depthT++;
      if (two === "}}") depthT--;
      if (two === "[[") depthL++;
      if (two === "]]") depthL--;
      cur += two;
      i++;
      continue;
    }
    if (inner[i] === "|" && depthT === 0 && depthL === 0) {
      out.push(cur);
      cur = "";
    } else {
      cur += inner[i];
    }
  }
  out.push(cur);
  return out;
}

const DROP_TEMPLATES = /^(efn|refn|sfn|cite|citation|ref|r|reflist|note|nb|cn|citation needed|clarify|when|update|dead link|webarchive|convert|cvt|lang|ipa)/;

/** Wikitext -> plain text, keeping the visible numbers of {{nts}}/{{ntsp}}/{{sort}} etc. */
export function stripWikitext(s: string): string {
  let t = s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>/]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<");
  t = removeTemplates(t, (name) => DROP_TEMPLATES.test(name));
  // Expand the number/sort templates to their visible text, innermost first.
  for (let guard = 0; guard < 10 && t.includes("{{"); guard++) {
    t = t.replace(/\{\{([^{}]*)\}\}/g, (_, inner: string) => {
      const parts = splitParams(inner).map((p) => p.trim());
      const name = parts[0].toLowerCase();
      if (name === "nts" || name === "ntsh" || name === "nowrap" || name === "nobr") return parts[1] ?? "";
      if (name === "ntsp") return `${parts[3] ?? ""}${parts[1] ?? ""} ${parts[2] ?? ""}`.trim();
      if (name === "sort" || name === "sortname") return parts[2] ?? parts[1] ?? "";
      if (name === "us$" || name === "usd") return `$${parts[1] ?? ""}`;
      if (name === "small" || name === "abbr") return parts[1] ?? "";
      if (name === "snd" || name === "ndash" || name === "spaced ndash" || name === "mdash") return " – ";
      return "";
    });
  }
  return t
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s([^\]]*)\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Season page headings ----------

export type Heading = {
  kind: string;
  /** International name, e.g. "Haiyan" */
  intl: string | null;
  /** PAGASA name, e.g. "Yolanda" */
  local: string | null;
  /** JTWC number, e.g. "30W" */
  jtwc: string | null;
};

const KINDS =
  /^(Super Typhoon|Violent Typhoon|Very Strong Typhoon|Typhoon|Severe Tropical Storm|Tropical Storm|Tropical Depression|Subtropical Storm|Subtropical Depression|Tropical Cyclone)\s+(.+)$/i;

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());

export function parseHeading(raw: string): Heading | null {
  const text = stripWikitext(raw).replace(/\s+/g, " ").trim();
  const m = text.match(KINDS);
  if (!m) return null;
  const kind = titleCase(m[1]);
  let rest = m[2].trim();
  let local: string | null = null;
  const paren = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    rest = paren[1].trim();
    const inside = paren[2].trim();
    if (!/^\d{4}$/.test(inside)) local = inside;
  }
  const jtwcMatch = rest.match(/^(\d{1,2}W)(?:\/\d{1,2}W)?$/i);
  let intl: string | null = null;
  let jtwc: string | null = null;
  if (jtwcMatch) {
    jtwc = jtwcMatch[1].toUpperCase();
  } else if (/^tropical depression$/i.test(kind) && !local) {
    // "Tropical Depression Bising": a depression named only by PAGASA.
    local = rest;
  } else {
    intl = rest;
  }
  const clean = (s: string | null) => (s ? s.replace(/\s+/g, " ").trim() || null : null);
  return { kind, intl: clean(intl), local: clean(local), jtwc };
}

export type SeasonSection = Heading & {
  heading: string;
  formed: string | null;
  dissipated: string | null;
  mainArticle: string | null;
};

/** Storm sections (=== heading ===) with their small infobox dates and {{Main|...}} article. */
export function parseSeasonSections(wikitext: string): SeasonSection[] {
  const re = /^(={3,4})\s*([^=].*?)\s*\1\s*$/gm;
  const marks: { heading: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(wikitext))) marks.push({ heading: m[2], start: m.index, end: m.index + m[0].length });
  const out: SeasonSection[] = [];
  marks.forEach((mk, i) => {
    const parsed = parseHeading(mk.heading);
    if (!parsed) return;
    const body = wikitext.slice(mk.end, marks[i + 1]?.start ?? wikitext.length);
    const field = (name: string) => {
      const f = body.match(new RegExp(`\\|\\s*${name}\\s*=\\s*([^|\\n}]*)`, "i"));
      return f ? stripWikitext(f[1]) || null : null;
    };
    const main = body.match(/\{\{\s*main\s*\|\s*([^|}]+)/i);
    out.push({
      ...parsed,
      heading: stripWikitext(mk.heading),
      formed: field("Formed"),
      dissipated: field("Dissipated"),
      mainArticle: main ? main[1].trim() : null,
    });
  });
  return out;
}

/**
 * PAGASA names used that season, from the "=== Philippines ===" names table
 * (names wrapped in {{tcname unused}} are dropped). Returns name keys, or null if there's no table.
 */
export function parsePagasaNames(wikitext: string): Set<string> | null {
  const start = wikitext.search(/^===\s*Philippines\s*===\s*$/m);
  if (start < 0) return null;
  const rest = wikitext.slice(start).replace(/^===[^\n]*\n/, "");
  const nextHeading = rest.search(/^==/m);
  const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const tStart = section.indexOf("{|");
  const tEnd = section.indexOf("|}", tStart);
  if (tStart < 0 || tEnd < 0) return null;
  const table = section.slice(tStart + 2, tEnd);
  const names = new Set<string>();
  for (const line of table.split("\n")) {
    if (!line.startsWith("|") || line.startsWith("|-")) continue;
    for (const cell of line.replace(/^\|/, "").split("||")) {
      const text = stripWikitext(cell);
      if (/^[A-Z][a-z]+(?:[- ][A-Za-z]+)?$/.test(text)) names.add(nameKey(text));
    }
  }
  return names.size ? names : null;
}

/** "November 3" + 2013 -> unix seconds (UTC midnight), or null. */
export function parseDayMonth(text: string | null, year: number): number | null {
  if (!text) return null;
  const m = text.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (!m) return null;
  const t = Date.parse(`${m[1]} ${m[2]}, ${m[3] ?? year} 00:00:00 UTC`);
  return Number.isFinite(t) ? Math.round(t / 1000) : null;
}

// ---------- Storm article infobox ----------

export type InfoboxEffects = {
  year: number | null;
  fatalities: string | null;
  damage: string | null;
  damagePrefix: string | null;
};

/** Reads year / fatalities / damage(s) / damage-prefix from the infobox at the top of an article. */
export function parseInfobox(wikitext: string): InfoboxEffects | null {
  const start = wikitext.search(/\{\{\s*Infobox (weather event|hurricane|tropical cyclone|storm)/i);
  if (start < 0) return null;
  const leadStart = wikitext.indexOf("\n'''", start);
  const box = wikitext.slice(start, leadStart > start ? leadStart : start + 12000);
  const fields = new Map<string, string>();
  for (const line of box.split("\n")) {
    const f = line.match(/^\s*\}*\s*\|\s*([A-Za-z0-9 _-]+?)\s*=\s*(.*)$/);
    if (f && !fields.has(f[1].toLowerCase())) fields.set(f[1].toLowerCase(), f[2]);
  }
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = fields.get(k);
      if (v !== undefined && v.trim() !== "") return v;
    }
    return null;
  };
  const yearRaw = get("year");
  const year = yearRaw ? Number(stripWikitext(yearRaw).match(/\d{4}/)?.[0] ?? NaN) : NaN;
  return {
    year: Number.isFinite(year) ? year : null,
    fatalities: get("fatalities", "deaths"),
    damage: get("damages", "damage"),
    damagePrefix: get("damage-prefix", "damages-prefix"),
  };
}

// ---------- Value parsing ----------

export type Parsed = { value: number | null; needsReview: boolean };

const QUALIFIER = /(at least|≥|>|<|~|approx|about|around|over|more than|less than|up to|nearly|almost|est|unknown|undetermined|\+|several|dozens|hundreds|thousands)/i;

function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, "")));
}

/** "6,352 total" -> 6352 (clean); "1,292–2,546" -> 1292 (review); "None" -> 0. */
export function parseDeaths(raw: string | null): Parsed {
  if (!raw) return { value: null, needsReview: false };
  let text = stripWikitext(raw);
  if (!text) return { value: null, needsReview: false };
  if (/^(none|no deaths?|0)( reported)?$/i.test(text.trim())) return { value: 0, needsReview: false };
  // "67 direct, 4 indirect (71 total)" -> 71: an explicit total wins.
  const total = text.match(/(\d[\d,]*)\s*total/i);
  if (total && numbersIn(text).length > 1) return { value: Number(total[1].replace(/,/g, "")), needsReview: true };
  // "61 (51 direct, 10 indirect)" -> 61: numbers in brackets are a breakdown of the number outside.
  const outside = text.replace(/\([^)]*\)/g, " ");
  if (numbersIn(outside).length >= 1 && numbersIn(outside).length < numbersIn(text).length) {
    const inner = parseDeaths(outside);
    return { value: inner.value, needsReview: true };
  }
  const nums = numbersIn(text);
  if (nums.length === 0) return { value: null, needsReview: true };
  if (nums.length > 1) {
    const isRange = /\d\s*(–|-|to)\s*\d/.test(text);
    return { value: isRange ? nums[0] : nums.reduce((a, b) => a + b, 0), needsReview: true };
  }
  text = text.trim();
  const rest = text.replace(/\d[\d,]*/, "").replace(/\b(total|confirmed|direct|reported|deaths?|people|killed|fatalities)\b/gi, "");
  return { value: nums[0], needsReview: QUALIFIER.test(rest) || /[a-z]{3,}/i.test(rest.replace(/\s|[(),.;:]/g, "")) };
}

const SCALE: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };

/** Damage in USD. Plain numbers (infobox default) are USD; pesos or other currencies -> null + review. */
export function parseDamage(raw: string | null, prefix: string | null): Parsed & { year: number | null } {
  if (!raw) return { value: null, needsReview: false, year: null };
  const text = stripWikitext(raw);
  if (!text) return { value: null, needsReview: false, year: null };
  const year = Number(text.match(/\((\d{4})\s*US\$?D?\)/i)?.[1] ?? NaN);
  const yearOut = Number.isFinite(year) ? year : null;
  const otherCurrency = /₱|PHP|peso|¥|yen|RMB|yuan|CN¥|NT\$|₫|VND|HK\$|€|£/i.test(text) && !/(US\$|USD|^\$|\s\$)/.test(text);
  if (otherCurrency) return { value: null, needsReview: true, year: yearOut };
  if (/^(none|minimal|minor|unknown|negligible|light|moderate|heavy|extensive)$/i.test(text)) {
    return { value: null, needsReview: !/^none$/i.test(text), year: yearOut };
  }
  const body = text.replace(/\(\d{4}\s*US\$?D?\)/i, "");
  // "22630000+11100000": per-country amounts added up on the page -> sum them.
  if (/^[>≥~\s$]*\d[\d,.]*(\s*\+\s*\$?\d[\d,.]*)+\s*$/.test(body)) {
    const sum = numbersIn(body).reduce((a, b) => a + b, 0);
    return { value: Math.round(sum), needsReview: true, year: yearOut };
  }
  const m = body.match(/(\d[\d,]*(?:\.\d+)?)\s*(thousand|million|billion|trillion)?/i);
  if (!m) return { value: null, needsReview: true, year: yearOut };
  // In "$10–20 million" the scale word belongs to both numbers.
  const scaleWord = m[2] ?? body.match(/(thousand|million|billion|trillion)/i)?.[1];
  const value = Number(m[1].replace(/,/g, "")) * (scaleWord ? SCALE[scaleWord.toLowerCase()] : 1);
  const isRange = /\d\s*(–|-|to)\s*\$?\d/.test(text);
  const qualified = QUALIFIER.test(text.replace(/\(\d{4}\s*US\$?D?\)/i, "")) || QUALIFIER.test(prefix ? stripWikitext(prefix) : "");
  return { value: Math.round(value), needsReview: isRange || qualified, year: yearOut };
}

// ---------- Retired names table ----------

export type RetiredRow = {
  local: string;
  intl: string | null;
  article: string | null;
  /** yyyymmdd from the sort key of the dates column */
  startDate: string | null;
  year: number | null;
  deathsRaw: string | null;
  damagePhpRaw: string | null;
  /** Deaths cell is shared with another storm (rowspan) or the row is missing cells: don't use per storm. */
  ambiguous: boolean;
};

/** Splits a table row on `||` (or `!!`) outside of {{templates}} and [[links]]. */
function splitCells(row: string, sep: "||" | "!!"): string[] {
  const out: string[] = [];
  let depthT = 0;
  let depthL = 0;
  let cur = "";
  for (let i = 0; i < row.length; i++) {
    const two = row.slice(i, i + 2);
    if (two === "{{" || two === "}}" || two === "[[" || two === "]]") {
      if (two === "{{") depthT++;
      if (two === "}}") depthT--;
      if (two === "[[") depthL++;
      if (two === "]]") depthL--;
      cur += two;
      i++;
    } else if ((two === sep || (sep === "!!" && two === "||")) && depthT === 0 && depthL === 0) {
      out.push(cur);
      cur = "";
      i++;
    } else {
      cur += row[i];
    }
  }
  out.push(cur);
  return out;
}

/** Rows of the wikitables on "List of retired Philippine typhoon names". */
export function parseRetiredTables(wikitext: string): RetiredRow[] {
  const rows: RetiredRow[] = [];
  for (const table of wikitext.split(/\n\{\|/).slice(1)) {
    const body = table.split(/\n\|\}/)[0];
    const chunks = body.split(/\n\|-[^\n]*/);
    const headerIdx = chunks.findIndex((c) => c.split("\n").some((l) => l.startsWith("!")));
    if (headerIdx < 0) continue;
    const headerLine = chunks[headerIdx].split("\n").find((l) => l.startsWith("!")) ?? "";
    const headers = splitCells(headerLine.replace(/^!/, ""), "!!").map((h) =>
      stripWikitext(h.replace(/^[^|[{]*\|(?!\|)/, "")).toLowerCase(),
    );
    const lines = chunks.slice(headerIdx);
    const col = (name: string) => headers.findIndex((h) => h.startsWith(name));
    const iName = col("name");
    const iDates = col("dates");
    const iDeaths = col("deaths");
    const iDamage = col("damage");
    if (iName < 0 || iDeaths < 0) continue;
    // Cells with rowspan=N also fill the same column in the next N-1 rows.
    const spans = new Map<number, { text: string; left: number }>();
    for (const rowText of lines.slice(1)) {
      const joined = rowText.trim().replace(/^\|/, "").replace(/\n\|/g, "||");
      if (!joined) continue;
      const own = splitCells(joined, "||").map((c) => {
        // Cell attributes like `bgcolor="#..." |` or `rowspan=2|`
        const attr = c.match(/^\s*((?:[a-z-]+\s*=\s*(?:"[^"]*"|[^\s|"]+)\s*)+)\|(?!\|)/i);
        const rowspan = attr ? Number(attr[1].match(/rowspan\s*=\s*"?(\d+)/i)?.[1] ?? 1) : 1;
        return { text: attr ? c.slice(attr[0].length) : c, rowspan };
      });
      const cells: string[] = [];
      const sharedCols = new Set<number>();
      for (let col = 0, k = 0; k < own.length || spans.has(col); col++) {
        const span = spans.get(col);
        if (span) {
          cells.push(span.text);
          sharedCols.add(col);
          if (--span.left <= 0) spans.delete(col);
          continue;
        }
        const cell = own[k++];
        if (!cell) break;
        cells.push(cell.text);
        if (cell.rowspan > 1) {
          spans.set(col, { text: cell.text, left: cell.rowspan - 1 });
          sharedCols.add(col);
        }
      }
      const ambiguous = sharedCols.has(iDeaths) || cells.length < headers.length - 1;
      const nameCell = cells[iName] ?? "";
      const link = nameCell.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      const shown = stripWikitext(nameCell);
      const nm = shown.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      const local = (nm ? nm[1] : shown).trim();
      if (!local) continue;
      const sortKey = (cells[iDates] ?? "").match(/\{\{\s*sort\s*\|\s*(\d{8})/i)?.[1] ?? null;
      const yearText = sortKey ? Number(sortKey.slice(0, 4)) : Number(stripWikitext(cells[iDates] ?? "").match(/\d{4}/)?.[0] ?? NaN);
      rows.push({
        local,
        intl: nm ? nm[2].trim() : null,
        article: link ? link[1].trim() : null,
        startDate: sortKey,
        year: Number.isFinite(yearText) ? yearText : null,
        deathsRaw: cells[iDeaths] ?? null,
        damagePhpRaw: iDamage >= 0 ? (cells[iDamage] ?? null) : null,
        ambiguous,
      });
    }
  }
  return rows;
}

/** Uppercase letters only, for name matching: "Kong-rey" -> "KONGREY". */
export const nameKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
