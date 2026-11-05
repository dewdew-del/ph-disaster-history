import type { Metadata } from "next";
import Link from "next/link";
import DamageCard from "@/components/bagyo/DamageCard";
import StormMapView from "@/components/bagyo/StormMapView";
import WindChartLazy from "@/components/bagyo/WindChartLazy";
import Row, { Facts } from "@/components/ui/Row";
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
    <figure className="relative h-[300px] overflow-hidden rounded-xl bg-[#0b1530] sm:h-[440px]">
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

  const title = s.local ?? s.name ?? label;
  const english = s.local && s.name ? s.name : null;

  return (
    <article className="mx-auto max-w-[1280px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <header>
        <h1 className="text-[3.25rem] leading-none md:text-[4.5rem]">{title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: categoryColor(s.cat, false) }} />
            {categoryName(s.cat)}
          </span>
          {english && <span>· {english}</span>}
          <span>· {s.season}</span>
          {s.retired && (
            <>
              ·{" "}
              <Link href="/bagyo/retired" className="text-foreground underline underline-offset-4">
                retired name
              </Link>
            </>
          )}
          {s.provisional && <span>· provisional data</span>}
        </p>
      </header>

      <div className="mt-8">
        <Facts items={facts} />
      </div>

      <div className={`mt-8 grid gap-5 ${photo ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}`}>
        <StormMapView id={s.id} label={`${label}, ${s.season}`} track={s.track} provinceSlugs={s.provinces} />
        {photo && <SatelliteFigure photo={photo} label={label} />}
      </div>

      <div className="mt-12">
        <Row title="Wind over time">
          <WindChartLazy track={s.track} />
        </Row>

        <Row title="Provinces in its path">
          {s.provinces.length > 0 ? (
            <p className="leading-relaxed">
              {s.provinces.map((slug, i) => (
                <span key={slug}>
                  {i > 0 && <span className="text-muted"> · </span>}
                  <Link href={`/lugar/${slug}`} className="underline decoration-control underline-offset-4 hover:decoration-foreground">
                    {provinceNames.get(slug) ?? slug}
                  </Link>
                </span>
              ))}
            </p>
          ) : (
            <p className="text-muted">Stayed more than 50 km from every province.</p>
          )}
        </Row>

        <Row title="In the PAR">
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-3">
            <div>
              <dd className="num text-[2rem]">{parDays !== null ? `${parDays < 1 ? "<1" : Math.round(parDays * 10) / 10} days` : "Edge only"}</dd>
              <dt className="mt-1 text-sm text-muted">Time inside PAR</dt>
            </div>
            <div>
              <dd className="num text-[2rem]">{s.minPres !== null ? `${s.minPres} hPa` : "—"}</dd>
              <dt className="mt-1 text-sm text-muted">Lowest pressure</dt>
            </div>
            {s.parIn !== null && (
              <div className="col-span-2 md:col-span-1">
                <dd className="text-lg">{formatDateTimePH(s.parIn)}</dd>
                <dt className="mt-1 text-sm text-muted">Entered PAR</dt>
              </div>
            )}
          </dl>
        </Row>

        <Row title="Deaths and damage">
          <DamageCard damage={s.damage} />
        </Row>

        {related.length > 0 && (
          <Row title="Same provinces, other deadly storms">
            <ol>
              {related.map((r) => (
                <li key={r.id} className="border-b border-border last:border-b-0">
                  <Link href={`/bagyo/${r.id}`} className="flex items-baseline gap-4 py-3 hover:text-muted">
                    <span className="flex-1 text-lg font-medium">
                      {r.local ?? stormLabel(r)} <span className="text-sm font-normal text-muted">{r.season}</span>
                    </span>
                    <span className="num text-2xl">{formatNumber(r.phDeaths ?? r.deaths ?? 0)}</span>
                    <span className="w-24 text-xs text-muted">{r.phDeaths !== null ? "dead in PH" : "dead, all areas"}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Row>
        )}

        <Row title="Sources">
          <p className="text-muted">
            <a href={ibtracsUrl} className="underline" target="_blank" rel="noopener noreferrer">
              IBTrACS track
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
            {" · "}
            <Link href="/sources" className="underline">
              All sources
            </Link>
          </p>
        </Row>
      </div>

      <nav className="mt-4 grid grid-cols-2 gap-6 border-t border-border pt-6" aria-label="Previous and next storm">
        {s.prev ? (
          <Link href={`/bagyo/${s.prev.id}`} className="group">
            <span className="text-sm text-muted">← Previous</span>
            <span className="block text-lg font-medium group-hover:underline">{s.prev.label}</span>
          </Link>
        ) : (
          <span />
        )}
        {s.next && (
          <Link href={`/bagyo/${s.next.id}`} className="group text-right">
            <span className="text-sm text-muted">Next →</span>
            <span className="block text-lg font-medium group-hover:underline">{s.next.label}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
