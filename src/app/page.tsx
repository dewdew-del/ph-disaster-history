import Link from "next/link";
import QuakeDotsMap, { MIN_MAG } from "@/components/home/QuakeDotsMap";
import { getQuakesSummary, getTyphoonIndex } from "@/lib/data-server";
import { formatNumber } from "@/lib/format";

export default function Home() {
  const quakes = getQuakesSummary();
  const typhoons = getTyphoonIndex();
  const deadliest = typhoons.storms
    .filter((s) => s.phDeaths !== null)
    .sort((a, b) => (b.phDeaths ?? 0) - (a.phDeaths ?? 0))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 md:px-8">
      <section className="grid items-center gap-6 pt-8 md:pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
        <div>
          <h1 className="text-[clamp(2.5rem,1.5rem+3.2vw,4rem)] leading-[1.02]">Where the Philippines shakes, and where the storms come in.</h1>
          <dl className="mt-8 flex gap-12 md:mt-10">
            <div>
              <dd className="num text-[3rem] md:text-[3.5rem]">{formatNumber(quakes.total)}</dd>
              <dt className="mt-2 text-sm text-muted">earthquakes since 1900</dt>
            </div>
            <div>
              <dd className="num text-[3rem] md:text-[3.5rem]">{formatNumber(typhoons.count)}</dd>
              <dt className="mt-2 text-sm text-muted">typhoons since 1945</dt>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 md:mt-10">
            <Link href="/linog" className="font-semibold underline decoration-[1.5px] underline-offset-[6px] hover:no-underline">
              Earthquake map →
            </Link>
            <Link href="/bagyo" className="font-semibold underline decoration-[1.5px] underline-offset-[6px] hover:no-underline">
              Typhoon map →
            </Link>
            <Link href="/lugar" className="font-semibold underline decoration-[1.5px] underline-offset-[6px] hover:no-underline">
              My province →
            </Link>
          </div>
        </div>
        <figure>
          <Link href="/linog" aria-label="Open the earthquake map">
            <QuakeDotsMap className="mx-auto h-auto max-h-[78vh] w-full max-w-[560px]" />
          </Link>
          <figcaption className="mt-2 text-center text-sm text-muted">Each dot is one M{MIN_MAG}+ earthquake since 1900 (USGS)</figcaption>
        </figure>
      </section>

      <section className="mt-16 md:mt-20">
        <h2 className="text-[2rem] leading-tight">Deadliest typhoons</h2>
        <ol className="mt-4 border-b border-border">
          {deadliest.map((s, i) => (
            <li key={s.id} className="border-t border-border">
              <Link href={`/bagyo/${s.id}`} className="flex items-baseline gap-4 py-4 hover:text-muted">
                <span className="w-6 text-sm tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate text-lg font-medium">
                  {s.local ?? s.name}
                  <span className="ml-2 text-sm font-normal text-muted">
                    {s.local && s.name ? `${s.name} · ` : ""}
                    {s.season}
                  </span>
                </span>
                <span className="num text-[1.75rem]">{formatNumber(s.phDeaths ?? 0)}</span>
                <span className="w-20 text-xs text-muted">dead in PH</span>
              </Link>
            </li>
          ))}
        </ol>
        <Link href="/bagyo/retired" className="mt-5 inline-block text-sm font-semibold underline underline-offset-4">
          All retired names →
        </Link>
      </section>
    </div>
  );
}
