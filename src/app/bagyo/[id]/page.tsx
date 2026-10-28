import type { Metadata } from "next";
import Link from "next/link";
import CategoryBadge from "@/components/bagyo/CategoryBadge";
import DamageCard from "@/components/bagyo/DamageCard";
import StormMapView from "@/components/bagyo/StormMapView";
import WindChartLazy from "@/components/bagyo/WindChartLazy";
import { getProvinceIndex, getTyphoonDetail, getTyphoonIndex } from "@/lib/data-server";
import { formatDateRangePH, formatDateTimePH } from "@/lib/format";
import { categoryName } from "@/lib/scales";
import { stormLabel } from "@/lib/types";

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

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}

export default async function StormPage({ params }: PageProps<"/bagyo/[id]">) {
  const { id } = await params;
  const s = getTyphoonDetail(id);
  const provinces = getProvinceIndex();
  const provinceNames = new Map(provinces.map((p) => [p.slug, p.name]));
  const label = stormLabel(s);
  const parDays = s.parIn !== null && s.parOut !== null ? (s.parOut - s.parIn) / 86400 : null;
  const ibtracsUrl = `https://ncics.org/ibtracs/index.php?name=v04r01-${s.id}`;

  return (
    <article className="mx-auto max-w-6xl px-4 py-6">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/bagyo" className="hover:underline">
          Bagyo Archive
        </Link>{" "}
        ›{" "}
        <Link href={`/bagyo?decade=${Math.floor(s.season / 10) * 10}`} className="hover:underline">
          {Math.floor(s.season / 10) * 10}s
        </Link>
      </nav>

      <header className="mt-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {label}, {s.season}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <CategoryBadge cat={s.cat} est={s.est} />
          <span>{categoryName(s.cat)} at peak</span>
          <span>·</span>
          <span>{formatDateRangePH(s.start, s.end)}</span>
          {s.retired && (
            <Link href="/bagyo/retired" className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
              Retired name
            </Link>
          )}
          {s.provisional && (
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs" title="IBTrACS has not finalized this track yet">
              Provisional data
            </span>
          )}
        </p>
        {!s.local && s.season >= 1990 && (
          <p className="mt-1 text-xs text-muted">No PAGASA local name found for this storm.</p>
        )}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <StormMapView id={s.id} label={`${label}, ${s.season}`} track={s.track} provinceSlugs={s.provinces} />
          <section>
            <h2 className="mb-2 text-sm font-semibold">Wind speed over time</h2>
            <WindChartLazy track={s.track} />
          </section>
        </div>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Peak wind"
              value={s.kmh !== null ? `${s.kmh} km/h` : "Unknown"}
              note={s.kmh !== null ? (s.est ? "estimated from JTWC" : "10-min, JMA") : undefined}
            />
            <Stat
              label="Peak inside PAR"
              value={s.parKmh !== null ? `${s.parKmh} km/h` : "Unknown"}
              note={s.parCat !== "UNK" ? categoryName(s.parCat) : undefined}
            />
            <Stat label="Lowest pressure" value={s.minPres !== null ? `${s.minPres} hPa` : "Unknown"} />
            <Stat
              label="Time inside PAR"
              value={parDays !== null ? `${parDays < 1 ? "<1" : Math.round(parDays * 10) / 10} days` : "Edge only"}
              note={s.parIn !== null ? `entered ${formatDateTimePH(s.parIn)}` : "named by PAGASA near the PAR edge"}
            />
          </div>

          <DamageCard damage={s.damage} />

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Provinces in the path area</h2>
            {s.provinces.length > 0 ? (
              <>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {s.provinces.map((slug) => (
                    <li key={slug}>
                      <Link
                        href={`/lugar/${slug}`}
                        className="inline-block rounded-full border border-border px-2 py-0.5 text-xs hover:border-accent"
                      >
                        {provinceNames.get(slug) ?? slug}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  Approximate path area: provinces within about 50 km of the track. Not an official list of affected areas.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">The track did not pass within about 50 km of any province.</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4 text-xs text-muted">
            <h2 className="mb-1 text-sm font-semibold text-foreground">Sources</h2>
            <ul className="space-y-1">
              <li>
                Track and winds:{" "}
                <a href={ibtracsUrl} className="text-accent underline" target="_blank" rel="noopener noreferrer">
                  IBTrACS {s.id}
                </a>{" "}
                (NOAA NCEI). Winds are JMA 10-minute winds; when missing, JTWC 1-minute × 0.88.
              </li>
              {s.localNameSource && (
                <li>
                  PAGASA name:{" "}
                  <a href={s.localNameSource} className="text-accent underline" target="_blank" rel="noopener noreferrer">
                    Wikipedia
                  </a>
                </li>
              )}
              {s.wikiUrl && s.wikiUrl !== s.localNameSource && (
                <li>
                  Article:{" "}
                  <a href={s.wikiUrl} className="text-accent underline" target="_blank" rel="noopener noreferrer">
                    Wikipedia
                  </a>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      <nav className="mt-10 flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-sm" aria-label="Other storms">
        {s.prev ? (
          <Link href={`/bagyo/${s.prev.id}`} className="hover:underline">
            ← {s.prev.label}
          </Link>
        ) : (
          <span />
        )}
        {s.next ? (
          <Link href={`/bagyo/${s.next.id}`} className="hover:underline">
            {s.next.label} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
