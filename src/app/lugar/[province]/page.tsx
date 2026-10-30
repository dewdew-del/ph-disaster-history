import type { Metadata } from "next";
import Link from "next/link";
import type { Feature, FeatureCollection } from "geojson";
import CategoryBadge from "@/components/bagyo/CategoryBadge";
import DecadeCharts from "@/components/lugar/DecadeCharts";
import ProvinceMapView from "@/components/lugar/ProvinceMapView";
import type { BarDatum } from "@/components/charts/Bars";
import { getProvinceIndex, readPublicJson } from "@/lib/data-server";
import { fastYearPH, formatDatePH, formatMag, formatNumber } from "@/lib/format";
import { provinceQuakeRows, provinceStorms } from "@/lib/province-stats";
import { WHERE_LAND, stormLabel, toQuake, type TyphoonSummary } from "@/lib/types";

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

function Stat({ label, value, note }: { label: string; value: string; note?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted">{note}</div>}
    </div>
  );
}

function StormRow({ s, extra }: { s: TyphoonSummary; extra?: string }) {
  return (
    <li className="flex items-center gap-2 py-1.5 text-sm">
      <CategoryBadge cat={s.cat} est={s.est} />
      <Link href={`/bagyo/${s.id}`} className="min-w-0 flex-1 truncate hover:underline">
        {stormLabel(s)}, {s.season}
      </Link>
      {extra && <span className="shrink-0 text-xs tabular-nums text-muted">{extra}</span>}
    </li>
  );
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
  const rows = provinceQuakeRows(province);
  const quakes = rows.map(toQuake);
  const storms = provinceStorms(province).sort((a, b) => b.start - a.start);

  const onLand = quakes.filter((q) => q.where === WHERE_LAND).length;
  const strongest = [...quakes].sort((a, b) => b.mag - a.mag || a.time - b.time).slice(0, 10);
  const m6 = quakes.filter((q) => q.mag >= 6).length;

  const byPhDeaths = storms.filter((s) => s.phDeaths !== null).sort((a, b) => (b.phDeaths ?? 0) - (a.phDeaths ?? 0));
  const byTotalDeaths = storms.filter((s) => s.deaths !== null).sort((a, b) => (b.deaths ?? 0) - (a.deaths ?? 0));
  const worst = byPhDeaths[0] ?? null;
  const strongestStorms = storms
    .filter((s) => s.kmh !== null)
    .sort((a, b) => (b.kmh ?? 0) - (a.kmh ?? 0))
    .slice(0, 8);
  const thisYear = new Date().getFullYear();
  const decadeNow = Math.floor(thisYear / 10) * 10;

  return (
    <article className="mx-auto max-w-6xl px-4 py-6">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/lugar" className="hover:underline">
          My Province
        </Link>{" "}
        › {info.region}
      </nav>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{info.name}</h1>
      <p className="mt-1 text-muted">{info.region}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Earthquakes M4.5+ since 1900"
          value={formatNumber(quakes.length)}
          note={`${formatNumber(onLand)} on land, ${formatNumber(quakes.length - onLand)} offshore nearby`}
        />
        <Stat
          label="Strongest earthquake"
          value={strongest[0] ? formatMag(strongest[0].mag) : "None"}
          note={strongest[0] ? `${formatDatePH(strongest[0].time)} · ${m6} quakes M6+` : undefined}
        />
        <Stat
          label="Typhoons in the path area since 1945"
          value={formatNumber(storms.length)}
          note={storms[0] ? `latest: ${stormLabel(storms[0])}, ${storms[0].season}` : undefined}
        />
        <Stat
          label="Deadliest typhoon (deaths in all of PH)"
          value={worst ? `${stormLabel(worst)}` : byTotalDeaths[0] ? stormLabel(byTotalDeaths[0]) : "No data"}
          note={
            worst ? (
              <>
                {worst.season} · {formatNumber(worst.phDeaths ?? 0)} deaths nationwide
              </>
            ) : byTotalDeaths[0] ? (
              <>
                {byTotalDeaths[0].season} · {formatNumber(byTotalDeaths[0].deaths ?? 0)} deaths, all areas
              </>
            ) : undefined
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <ProvinceMapView feature={feature} bbox={info.bbox} rows={rows} name={info.name} />
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
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Strongest earthquakes</h2>
            {strongest.length ? (
              <ol className="mt-2 divide-y divide-border">
                {strongest.map((q) => (
                  <li key={q.id} className="py-1.5 text-sm">
                    <a
                      href={`https://earthquake.usgs.gov/earthquakes/eventpage/${q.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {formatMag(q.mag)}
                    </a>{" "}
                    <span className="text-muted">· {formatDatePH(q.time)}</span>
                    <div className="truncate text-xs text-muted">
                      {q.where === WHERE_LAND ? "" : "Offshore · "}
                      {q.place}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-muted">No M4.5+ quakes recorded in or near this province.</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Deadliest typhoons that passed here</h2>
            {byPhDeaths.length ? (
              <ul className="mt-1 divide-y divide-border">
                {byPhDeaths.slice(0, 8).map((s) => (
                  <StormRow key={s.id} s={s} extra={`${formatNumber(s.phDeaths ?? 0)} in PH`} />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No curated death counts for storms in this path area.</p>
            )}
            <p className="mt-2 text-xs text-muted">Deaths are for the whole country, not only this province.</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Strongest typhoons that passed here</h2>
            <ul className="mt-1 divide-y divide-border">
              {strongestStorms.map((s) => (
                <StormRow key={s.id} s={s} extra={`${s.kmh} km/h`} />
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Most recent</h2>
            <ul className="mt-1 divide-y divide-border">
              {storms.slice(0, 8).map((s) => (
                <StormRow key={s.id} s={s} extra={formatDatePH(s.start)} />
              ))}
            </ul>
            {storms.length > 0 && (
              <Link href={`/bagyo?province=${province}`} className="mt-2 inline-block text-sm text-accent underline">
                All {formatNumber(storms.length)} storms in Bagyo · Typhoons →
              </Link>
            )}
          </section>

          <p className="text-xs text-muted">
            Typhoon path area = track within about 50 km of the province (approximate, not an official list). Quakes
            include those offshore within 100 km. Sources: USGS, IBTrACS, Wikipedia.{" "}
            <Link href="/sources" className="text-accent underline">
              All sources
            </Link>
          </p>
        </aside>
      </div>
    </article>
  );
}
