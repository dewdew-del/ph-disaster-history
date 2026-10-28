// Run: npm run test:scripts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nameKey,
  parseDamage,
  parseDayMonth,
  parseDeaths,
  parseHeading,
  parseInfobox,
  parsePagasaNames,
  parseRetiredTables,
  parseSeasonSections,
  stripWikitext,
} from "./wiki";

test("stripWikitext keeps visible text and numbers", () => {
  assert.equal(stripWikitext("816&nbsp;total <!--748 in the Philippines-->"), "816 total");
  assert.equal(stripWikitext("{{nts|56}}"), "56");
  assert.equal(stripWikitext("{{ntsp|31000000||₱}}"), "₱31000000");
  assert.equal(stripWikitext("[[Typhoon Joan (1970)|Sening (Joan)]]"), "Sening (Joan)");
  assert.equal(stripWikitext("1,292–2,546<ref name=\"a\"/><ref name=\"b\">x {{cite web|a=b}}</ref>"), "1,292–2,546");
  assert.equal(stripWikitext("{{sort|19640626|26 June&nbsp;– 3 July 1964}}"), "26 June – 3 July 1964");
  assert.equal(stripWikitext("921 direct{{efn|nested {{lang|x|y}} note}}"), "921 direct");
});

test("parseHeading handles the season page formats", () => {
  assert.deepEqual(parseHeading("Typhoon Haiyan (Yolanda)"), { kind: "Typhoon", intl: "Haiyan", local: "Yolanda", jtwc: null });
  assert.deepEqual(parseHeading("Tropical Depression Bising"), { kind: "Tropical Depression", intl: null, local: "Bising", jtwc: null });
  assert.deepEqual(parseHeading("Tropical Depression 30W (Wilma)"), { kind: "Tropical Depression", intl: null, local: "Wilma", jtwc: "30W" });
  assert.deepEqual(parseHeading("Tropical Depression 32W/33W (Sendang)"), { kind: "Tropical Depression", intl: null, local: "Sendang", jtwc: "32W" });
  assert.deepEqual(parseHeading("Severe Tropical Storm Kong-rey (Nando)"), { kind: "Severe Tropical Storm", intl: "Kong-rey", local: "Nando", jtwc: null });
  assert.deepEqual(parseHeading("Tropical Storm Pewa"), { kind: "Tropical Storm", intl: "Pewa", local: null, jtwc: null });
  assert.deepEqual(parseHeading("Tropical Depression 13W"), { kind: "Tropical Depression", intl: null, local: null, jtwc: "13W" });
  assert.equal(parseHeading("Other systems"), null);
  assert.equal(parseHeading("International names"), null);
});

test("parseSeasonSections reads dates and the main article", () => {
  const wt = `== Systems ==
===Typhoon Haiyan (Yolanda)===
{{Infobox tropical cyclone small
| Basin=WPac
| Formed=November 3
| Dissipated=November 11
}}
{{Main|Typhoon Haiyan}}
Text.
=== Tropical Depression Bising ===
{{Infobox tropical cyclone small
| Formed=January 6
| Dissipated=January 13
}}
=== Other systems ===
`;
  const s = parseSeasonSections(wt);
  assert.equal(s.length, 2);
  assert.equal(s[0].mainArticle, "Typhoon Haiyan");
  assert.equal(s[0].formed, "November 3");
  assert.equal(s[1].local, "Bising");
  assert.equal(s[1].mainArticle, null);
  assert.equal(parseDayMonth("November 3", 2013), Date.UTC(2013, 10, 3) / 1000);
});

test("parseInfobox reads the Effects fields", () => {
  const wt = `{{Infobox weather event
| formed = November 3, 2013
}}{{Infobox weather event/Effects
| year = 2013
| fatalities = 6,352 total
| damage = 2980000000
| damage-prefix = >
| areas = [[Guam]]
}}{{Infobox weather event/Footer
'''Typhoon Haiyan''' was`;
  assert.deepEqual(parseInfobox(wt), { year: 2013, fatalities: "6,352 total", damage: "2980000000", damagePrefix: ">" });
});

test("parseDeaths", () => {
  assert.deepEqual(parseDeaths("6,352 total"), { value: 6352, needsReview: false });
  assert.deepEqual(parseDeaths("921 direct<!--671 PH-->"), { value: 921, needsReview: false });
  assert.deepEqual(parseDeaths("1,292–2,546<ref name=\"x\"/>"), { value: 1292, needsReview: true });
  assert.deepEqual(parseDeaths("≥6,300"), { value: 6300, needsReview: true });
  assert.deepEqual(parseDeaths("At least 50"), { value: 50, needsReview: true });
  assert.deepEqual(parseDeaths("None"), { value: 0, needsReview: false });
  assert.deepEqual(parseDeaths("Unknown"), { value: null, needsReview: true });
  assert.deepEqual(parseDeaths("2 direct, 1 indirect"), { value: 3, needsReview: true });
  assert.deepEqual(parseDeaths(null), { value: null, needsReview: false });
});

test("parseDamage", () => {
  assert.deepEqual(parseDamage("2980000000", ">"), { value: 2980000000, needsReview: true, year: null });
  assert.deepEqual(parseDamage("1160000000", null), { value: 1160000000, needsReview: false, year: null });
  assert.deepEqual(parseDamage("$2.2 billion (2013 USD)", null), { value: 2200000000, needsReview: false, year: 2013 });
  assert.deepEqual(parseDamage("{{ntsp|31000000||₱}}", null), { value: null, needsReview: true, year: null });
  assert.deepEqual(parseDamage("Minimal", null), { value: null, needsReview: true, year: null });
  assert.deepEqual(parseDamage("$10–20 million", null), { value: 10000000, needsReview: true, year: null });
});

test("parseRetiredTables", () => {
  const wt = `intro
{| class="wikitable sortable"
|-
! Name !! Replacement !! Dates active !! Category !! Sustained <br>wind speeds !! Pressure !! class="unsortable" |Provinces affected !! Damage<br><small>(PHP)</small> !! Deaths !! Missing || class="unsortable" |Refs
|-
| [[Typhoon Winnie (Dading)|Dading (Winnie)]] || Didang || {{sort|19640626|26 June&nbsp;– 3 July 1964}} || bgcolor="#{{storm color|TY}}" |{{Sort|3|Typhoon}} || x || y || Luzon || {{ntsp|31000000||₱}} || {{nts|56}} || {{sort|0|None}} ||{{EM-DAT}}
|-
| [[Typhoon Haiyan|Yolanda (Haiyan)]] || Ursula || {{sort|20131106|6–9 November 2013}} || a || b || c || Visayas || {{ntsp|95500000000||₱}} || {{nts|6300}} || 1,062 || r
|}`;
  const rows = parseRetiredTables(wt);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    local: "Dading",
    intl: "Winnie",
    article: "Typhoon Winnie (Dading)",
    startDate: "19640626",
    year: 1964,
    deathsRaw: " {{nts|56}} ",
    damagePhpRaw: " {{ntsp|31000000||₱}} ",
  });
  assert.equal(rows[1].local, "Yolanda");
  assert.equal(parseDeaths(rows[1].deathsRaw).value, 6300);
});

test("parsePagasaNames skips unused names", () => {
  const wt = `=== Philippines ===
{{main|List of retired Philippine typhoon names}}
{| class="wikitable" align=right
|-
| [[Typhoon Haiyan|Yolanda]] || Bising || {{tcname unused|Ulding}}
|-
! colspan=5|Auxiliary list
|}
Text.
== Season effects ==`;
  const names = parsePagasaNames(wt)!;
  assert.ok(names.has("YOLANDA"));
  assert.ok(names.has("BISING"));
  assert.ok(!names.has("ULDING"));
  assert.equal(parsePagasaNames("no table here"), null);
});

test("nameKey", () => {
  assert.equal(nameKey("Kong-rey"), "KONGREY");
  assert.equal(nameKey("MAN-YI"), "MANYI");
});
