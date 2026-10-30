import type { Metadata } from "next";
import Link from "next/link";
import type { Feature, FeatureCollection } from "geojson";
import DecadeCharts from "@/components/lugar/DecadeCharts";
import ProvinceMapView from "@/components/lugar/ProvinceMapView";
import ProvinceSwitch from "@/components/lugar/ProvinceSwitch";
import type { BarDatum } from "@/components/charts/Bars";
import { getProvinceIndex, getSatellitePhotos, readPublicJson } from "@/lib/data-server";
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
  const photos = getSatellitePhotos();
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
    <article className="mx-auto max-w-[1440px] px-4 pb-12 pt-6 md:px-8">
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-[2.125rem]">{info.name}</h1>
          <p className="text-muted">{region}</p>
        </div>
        <ProvinceSwitch current={province} provinces={provinces} />
      </header>

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl bg-surface md:grid-cols-4">
        {facts.map(([value, label], i) => (
          <div
            key={label}
            className={`px-5 py-4 ${i % 2 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}
          >
            <dd className="truncate text-2xl font-bold leading-tight tabular-nums md:text-[2rem]">{value}</dd>
            <dt className="text-sm text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <ProvinceMapView feature={feature} bbox={info.bbox} rows={rows} name={info.name} storms={shownStorms} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 [&>section]:min-w-0">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold">Deadliest typhoons</h2>
            {storms.length > 0 && (
              <Link href={`/bagyo?province=${province}`} className="font-semibold text-accent hover:underline">
                All {formatNumber(storms.length)} →
              </Link>
            )}
          </div>
          {deadliest.length ? (
            <ol className="mt-2">
              {deadliest.map((s) => {
                const p = photos[s.id];
                return (
                  <li key={s.id} className="border-b border-border/60">
                    <Link href={`/bagyo/${s.id}`} className="flex items-center gap-4 py-2.5 hover:text-accent">
                      {p ? (
                        // eslint-disable-next-line @next/next/no-img-element -- static export, image already sized
                        <img src={p.file} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="h-12 w-12 shrink-0 rounded-lg bg-surface" />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-semibold">{s.local ?? stormLabel(s)}</span> <span className="text-muted">{s.season}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-lg font-bold leading-none tabular-nums">{formatNumber(s.phDeaths ?? s.deaths ?? 0)}</span>
                        <span className="text-xs text-muted">{s.phDeaths !== null ? "dead in PH" : "dead, all areas"}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-3 text-muted">No death counts yet for storms that passed here.</p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold">Strongest earthquakes</h2>
          {strongest.length ? (
            <ol className="mt-2">
              {strongest.map((q) => (
                <li key={q.id} className="border-b border-border/60">
                  <a
                    href={`https://earthquake.usgs.gov/earthquakes/eventpage/${q.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[4.25rem] items-center gap-4 py-2.5 hover:text-accent"
                  >
                    <span className="w-16 shrink-0 text-xl font-bold tabular-nums">{formatMag(q.mag).replace("M", "")}</span>
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
            <p className="mt-3 text-muted">No M4.5+ quakes recorded in or near {info.name}.</p>
          )}
        </section>
      </div>

      <section className="mt-12">
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
      </section>

      <p className="mt-8 text-sm text-muted">
        Storms count when their track passed within about 50 km. Death counts are for the whole country.{" "}
        <Link href="/sources" className="underline">
          Sources
        </Link>
      </p>
    </article>
  );
}
