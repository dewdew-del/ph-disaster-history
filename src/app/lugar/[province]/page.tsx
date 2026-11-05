import type { Metadata } from "next";
import Link from "next/link";
import type { Feature, FeatureCollection } from "geojson";
import DecadeCharts from "@/components/lugar/DecadeCharts";
import Row, { Facts } from "@/components/ui/Row";
import ProvinceMapView from "@/components/lugar/ProvinceMapView";
import ProvinceSwitch from "@/components/lugar/ProvinceSwitch";
import type { BarDatum } from "@/components/charts/Bars";
import { getProvinceIndex, readPublicJson } from "@/lib/data-server";
import { fastYearPH, formatDatePH, formatMag, formatNumber } from "@/lib/format";
import { provinceQuakeRows, provinceStorms } from "@/lib/province-stats";
import { WHERE_LAND, stormLabel, toQuake } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return getProvinceIndex().map((p) => ({ province: p.slug }));
}

function findProvince(slug: string) {
  const info = getProvinceIndex().find((p) => p.slug === slug)!;
  const geo = readPublicJson<FeatureCollection>("data/provinces.json");
  const feature = geo.features.find((f) => f.properties?.slug === slug) as Feature;
  return { info, feature };
}

export async function generateMetadata({ params }: PageProps<"/lugar/[province]">): Promise<Metadata> {
  const { province } = await params;
  const { info } = findProvince(province);
  return {
    title: `${info.name}: earthquakes and typhoons`,
    description: `Earthquake and typhoon history of ${info.name} (${info.region}), Philippines.`,
  };
}

function perDecade(years: number[], from: number, to: number): BarDatum[] {
  const counts = new Map<number, number>();
  for (const y of years) counts.set(Math.floor(y / 10) * 10, (counts.get(Math.floor(y / 10) * 10) ?? 0) + 1);
  const out: BarDatum[] = [];
  for (let d = from; d <= to; d += 10) out.push({ label: `${d}s`, value: counts.get(d) ?? 0 });
  return out;
}

export default async function ProvincePage({ params }: PageProps<"/lugar/[province]">) {
  const { province } = await params;
  const { info, feature } = findProvince(province);
  const provinces = getProvinceIndex().map((p) => ({ slug: p.slug, name: p.name }));
  const rows = provinceQuakeRows(province);
  const quakes = rows.map(toQuake);
  const storms = provinceStorms(province).sort((a, b) => b.start - a.start);

  const strongest = [...quakes].sort((a, b) => b.mag - a.mag || a.time - b.time).slice(0, 5);
  const deadliest = storms
    .filter((s) => (s.phDeaths ?? s.deaths ?? 0) > 0)
    .sort((a, b) => (b.phDeaths ?? b.deaths ?? 0) - (a.phDeaths ?? a.deaths ?? 0))
    .slice(0, 5);
  const shownStorms = (deadliest.length ? deadliest : storms.slice(0, 5)).map((s) => ({
    id: s.id,
    label: `${stormLabel(s)}, ${s.season}`,
    season: s.season,
  }));
  const decadeNow = Math.floor(new Date().getFullYear() / 10) * 10;
  const region = info.region.replace(/\s*\(.*\)$/, "");

  const facts: [string, string][] = [
    [formatNumber(storms.length), "Typhoons since 1945"],
    [formatNumber(quakes.length), "Earthquakes M4.5+"],
    [strongest[0] ? formatMag(strongest[0].mag) : "—", strongest[0] ? `Strongest quake, ${fastYearPH(strongest[0].time)}` : "No quakes recorded"],
    [
      deadliest[0] ? (deadliest[0].local ?? stormLabel(deadliest[0])) : "—",
      deadliest[0] ? `Deadliest storm, ${deadliest[0].season}` : "No death data yet",
    ],
  ];

  return (
    <article className="mx-auto max-w-[1280px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[3.25rem] leading-none md:text-[4.5rem]">{info.name}</h1>
          <p className="mt-3 text-muted">{region}</p>
        </div>
        <ProvinceSwitch current={province} provinces={provinces} />
      </header>

      <div className="mt-8">
        <Facts items={facts} />
      </div>

      <div className="mt-8">
        <ProvinceMapView feature={feature} bbox={info.bbox} rows={rows} name={info.name} storms={shownStorms} />
      </div>

      <div className="mt-12">
        <Row title="Deadliest typhoons">
          {deadliest.length ? (
            <ol>
              {deadliest.map((s, i) => (
                <li key={s.id} className="border-b border-border last:border-b-0">
                  <Link href={`/bagyo/${s.id}`} className="flex items-baseline gap-4 py-3 hover:text-muted">
                    <span className="w-6 text-sm tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate text-lg font-medium">
                      {s.local ?? stormLabel(s)} <span className="text-sm font-normal text-muted">{s.season}</span>
                    </span>
                    <span className="num text-2xl">{formatNumber(s.phDeaths ?? s.deaths ?? 0)}</span>
                    <span className="w-24 text-xs text-muted">{s.phDeaths !== null ? "dead in PH" : "dead, all areas"}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">No death counts yet for storms that passed here.</p>
          )}
          {storms.length > 0 && (
            <Link href={`/bagyo?province=${province}`} className="mt-4 inline-block font-semibold underline underline-offset-4">
              All {formatNumber(storms.length)} storms on the map →
            </Link>
          )}
        </Row>

        <Row title="Strongest earthquakes">
          {strongest.length ? (
            <ol>
              {strongest.map((q) => (
                <li key={q.id} className="border-b border-border last:border-b-0">
                  <a
                    href={`https://earthquake.usgs.gov/earthquakes/eventpage/${q.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-baseline gap-4 py-3 hover:text-muted"
                  >
                    <span className="num w-14 shrink-0 text-2xl">{formatMag(q.mag).replace("M", "")}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {q.where === WHERE_LAND ? "" : "Offshore · "}
                      {q.place}
                    </span>
                    <span className="shrink-0 text-sm text-muted">{formatDatePH(q.time)}</span>
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">No M4.5+ quakes recorded in or near {info.name}.</p>
          )}
        </Row>

        <Row title="By decade">
          <DecadeCharts
            storms={perDecade(
              storms.map((s) => s.season),
              1940,
              decadeNow,
            )}
            quakes={perDecade(
              quakes.map((q) => fastYearPH(q.time)),
              1900,
              decadeNow,
            )}
          />
        </Row>

        <Row title="Sources">
          <p className="text-muted">
            Storms count when their track passed within about 50 km. Death counts are for the whole country.{" "}
            <Link href="/sources" className="underline">
              All sources
            </Link>
          </p>
        </Row>
      </div>
    </article>
  );
}
