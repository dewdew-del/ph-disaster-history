import type { Metadata } from "next";
import Link from "next/link";
import DamageCard from "@/components/bagyo/DamageCard";
import StormMapView from "@/components/bagyo/StormMapView";
import WindChartLazy from "@/components/bagyo/WindChartLazy";
import { getProvinceIndex, getSatellitePhotos, getTyphoonDetail, getTyphoonIndex } from "@/lib/data-server";
import type { SatellitePhoto } from "@/lib/data-server";
import { formatDateRangePH, formatDateTimePH, formatNumber, formatUsd } from "@/lib/format";
import { categoryColor, categoryName } from "@/lib/scales";
import { stormLabel, type TyphoonSummary } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTyphoonIndex().storms.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/bagyo/[id]">): Promise<Metadata> {
  const { id } = await params;
  const s = getTyphoonDetail(id);
  const title = `${stormLabel(s)}, ${s.season}`;
  return {
    title,
    description: `${categoryName(s.cat)} that entered the Philippine Area of Responsibility in ${s.season}: track, strength${
      s.damage ? ", deaths and damage" : ""
    }.`,
  };
}

const photoDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function SatelliteFigure({ photo, label }: { photo: SatellitePhoto; label: string }) {
  const credit = photo.file.startsWith("/images/satellite/") ? `https://worldview.earthdata.nasa.gov/?t=${photo.date}` : "/sources#pictures";
  return (
    <figure className="relative h-[300px] overflow-hidden rounded-2xl bg-[#0b1530] sm:h-[440px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, image already sized */}
      <img src={photo.file} alt={`Satellite photo of ${label} on ${photoDate(photo.date)}`} className="h-full w-full object-cover" />
      <figcaption className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
        {photoDate(photo.date)} ·{" "}
        <a href={credit} className="underline">
          {photo.source}
        </a>
      </figcaption>
    </figure>
  );
}

/** Up to four big numbers in one grey strip (two columns on phones). */
function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl bg-surface md:grid-cols-4">
      {items.map(([value, label], i) => (
        <div key={label} className={`px-5 py-4 ${i % 2 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
          <dd className="text-2xl font-bold leading-tight tabular-nums md:text-[2rem]">{value}</dd>
          <dt className="text-sm text-muted">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** Other storms that crossed the same provinces, deadliest first. */
function relatedStorms(s: TyphoonSummary, all: TyphoonSummary[]): TyphoonSummary[] {
  const mine = new Set(s.prov);
  return all
    .filter((x) => x.id !== s.id && (x.phDeaths ?? x.deaths ?? 0) > 0 && x.prov.some((p) => mine.has(p)))
    .sort((a, b) => (b.phDeaths ?? b.deaths ?? 0) - (a.phDeaths ?? a.deaths ?? 0))
    .slice(0, 4);
}

export default async function StormPage({ params }: PageProps<"/bagyo/[id]">) {
  const { id } = await params;
  const s = getTyphoonDetail(id);
  const index = getTyphoonIndex();
  const photos = getSatellitePhotos();
  const photo = photos[s.id];
  const provinceNames = new Map(getProvinceIndex().map((p) => [p.slug, p.name]));
  const label = stormLabel(s);
  const parDays = s.parIn !== null && s.parOut !== null ? (s.parOut - s.parIn) / 86400 : null;
  const ibtracsUrl = `https://ncics.org/ibtracs/index.php?name=v04r01-${s.id}`;
  const related = relatedStorms(s, index.storms);
  const deaths = s.phDeaths ?? s.deaths;

  const facts: [string, string][] = [
    [deaths !== null ? formatNumber(deaths) : "—", s.phDeaths !== null ? "Dead in PH" : deaths !== null ? "Dead, all areas" : "No death data yet"],
    [s.kmh !== null ? `${s.kmh} km/h` : "—", s.est ? "Peak wind (estimated)" : "Peak wind (10-min)"],
    [
      s.damage?.damageUsd ? formatUsd(s.damage.damageUsd).replace(" billion", "B").replace(" million", "M") : "—",
      s.damage?.damageUsd ? `Damage, all areas (${s.damage.damageYear ?? "?"} USD)` : "No damage data yet",
    ],
    [formatDateRangePH(s.start, s.end).replace(/,\s*\d{4}$/, ""), `${s.season}, PH time`],
  ];

  return (
    <article className="mx-auto max-w-[1440px] px-4 pb-12 pt-6 md:px-8">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-[2.125rem]">
          {label}, {s.season}
        </h1>
        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm font-semibold">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: categoryColor(s.cat, false) }} />
          {categoryName(s.cat)}
        </span>
        {s.retired && (
          <Link href="/bagyo/retired" className="rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
            Retired name
          </Link>
        )}
        {s.provisional && <span className="rounded-full bg-surface px-3 py-1 text-sm text-muted">Provisional data</span>}
      </header>

      <div className="mt-5">
        <Facts items={facts} />
      </div>

      <div className={`mt-5 grid gap-5 ${photo ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}`}>
        {photo && <SatelliteFigure photo={photo} label={label} />}
        <StormMapView id={s.id} label={`${label}, ${s.season}`} track={s.track} provinceSlugs={s.provinces} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <h2 className="text-xl font-semibold">Wind speed</h2>
          <div className="mt-3">
            <WindChartLazy track={s.track} />
          </div>
        </section>
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Provinces in its path</h2>
            {s.provinces.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {s.provinces.map((slug) => (
                  <li key={slug}>
                    <Link href={`/lugar/${slug}`} className="inline-block rounded-full bg-surface px-3.5 py-1.5 text-sm hover:bg-raised">
                      {provinceNames.get(slug) ?? slug}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Stayed more than 50 km from every province.</p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted">Lowest pressure</dt>
              <dd className="text-lg font-semibold">{s.minPres !== null ? `${s.minPres} hPa` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Time inside PAR</dt>
              <dd className="text-lg font-semibold">
                {parDays !== null ? `${parDays < 1 ? "<1" : Math.round(parDays * 10) / 10} days` : "Edge only"}
              </dd>
            </div>
            {s.parIn !== null && (
              <div className="col-span-2">
                <dt className="text-muted">Entered PAR</dt>
                <dd>{formatDateTimePH(s.parIn)}</dd>
              </div>
            )}
          </dl>
          <DamageCard damage={s.damage} />
          <p className="text-sm text-muted">
            Sources:{" "}
            <a href={ibtracsUrl} className="underline" target="_blank" rel="noopener noreferrer">
              IBTrACS
            </a>
            {s.wikiUrl && (
              <>
                {" · "}
                <a href={s.wikiUrl} className="underline" target="_blank" rel="noopener noreferrer">
                  Wikipedia
                </a>
              </>
            )}
            {s.damage?.phSourceUrl && (
              <>
                {" · "}
                <a href={s.damage.phSourceUrl} className="underline" target="_blank" rel="noopener noreferrer">
                  PH deaths
                </a>
              </>
            )}
          </p>
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Other deadly storms that hit these provinces</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => {
              const p = photos[r.id];
              return (
                <li key={r.id}>
                  <Link href={`/bagyo/${r.id}`} className="flex items-center gap-4 rounded-2xl bg-surface p-3 hover:bg-raised">
                    {p ? (
                      // eslint-disable-next-line @next/next/no-img-element -- static export, image already sized
                      <img src={p.file} alt="" loading="lazy" className="h-24 w-20 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="h-24 w-20 shrink-0 rounded-xl bg-raised" />
                    )}
                    <span>
                      <span className="block text-lg font-semibold leading-tight">{r.local ?? stormLabel(r)}</span>
                      <span className="block text-sm text-muted">{r.season}</span>
                      <span className="mt-1.5 block text-xl font-bold leading-none tabular-nums">
                        {formatNumber(r.phDeaths ?? r.deaths ?? 0)}
                      </span>
                      <span className="block text-xs text-muted">{r.phDeaths !== null ? "dead in PH" : "dead, all areas"}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <nav className="mt-10 grid gap-3 sm:grid-cols-2" aria-label="Previous and next storm">
        {s.prev ? (
          <Link href={`/bagyo/${s.prev.id}`} className="rounded-2xl bg-surface px-5 py-4 hover:bg-raised">
            <span className="text-sm text-muted">← Previous storm</span>
            <span className="block text-lg font-semibold">{s.prev.label}</span>
          </Link>
        ) : (
          <span />
        )}
        {s.next && (
          <Link href={`/bagyo/${s.next.id}`} className="rounded-2xl bg-surface px-5 py-4 text-right hover:bg-raised">
            <span className="text-sm text-muted">Next storm →</span>
            <span className="block text-lg font-semibold">{s.next.label}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
