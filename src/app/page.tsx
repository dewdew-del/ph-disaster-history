import Link from "next/link";
import QuakeDotsMap, { MIN_MAG } from "@/components/home/QuakeDotsMap";
import { getQuakes, getQuakesSummary, getTyphoonIndex } from "@/lib/data-server";
import { fastYearPH, formatMag, formatNumber } from "@/lib/format";

// Home is a board of flat tiles fitted edge to edge: name, map, four numbers, four links, the deadliest list, storms per decade.
const tile = "rounded-md bg-surface p-5 md:p-6";
const linkTile =
  "group flex min-h-20 items-end justify-between gap-3 rounded-md p-5 text-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:p-6";

export default function Home() {
  const quakes = getQuakesSummary();
  const typhoons = getTyphoonIndex();
  const deadliest = typhoons.storms
    .filter((s) => s.phDeaths !== null)
    .sort((a, b) => (b.phDeaths ?? 0) - (a.phDeaths ?? 0))
    .slice(0, 5);
  const strongest = getQuakes().rows.reduce((a, b) => (b[2] > a[2] ? b : a));

  const perDecade = new Map<number, number>();
  for (const s of typhoons.storms) {
    const d = Math.floor(s.season / 10) * 10;
    perDecade.set(d, (perDecade.get(d) ?? 0) + 1);
  }
  const decades = [...perDecade.entries()].sort((a, b) => a[0] - b[0]);
  const maxDecade = Math.max(...decades.map(([, n]) => n));

  const numbers: { value: string; label: string; kind: "quake" | "storm" }[] = [
    { value: formatNumber(quakes.total), label: "earthquakes since 1900", kind: "quake" },
    { value: formatNumber(typhoons.count), label: "typhoons since 1945", kind: "storm" },
    { value: formatMag(strongest[2]), label: `strongest quake, ${fastYearPH(strongest[1])}`, kind: "quake" },
    { value: formatNumber(deadliest[0]?.phDeaths ?? 0), label: `dead in PH, ${deadliest[0]?.local ?? "Yolanda"} ${deadliest[0]?.season ?? ""}`, kind: "storm" },
  ];

  return (
    <div className="mx-auto grid max-w-[1440px] gap-2 px-2 pb-12 pt-2 md:px-4 lg:grid-cols-12">
      <div className="grid gap-2 lg:col-span-7 lg:grid-rows-[auto_auto_auto]">
        <section className={`${tile} flex flex-col justify-between gap-6 md:min-h-[300px]`}>
          <h1 className="text-[clamp(2.4rem,1.4rem+3.6vw,4.75rem)] leading-[1.02]">Where the Philippines shakes and the storms come in</h1>
          <p className="max-w-[40ch] text-lg text-muted">
            <span className="font-medium text-foreground">Every M4.5+ earthquake since 1900 and every typhoon since 1945,</span> mapped from USGS
            and IBTrACS data.
          </p>
        </section>

        <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {numbers.map((n) => (
            <div key={n.label} className={`${tile} flex min-h-32 flex-col justify-between gap-4`}>
              <dd className={`num text-[clamp(2rem,1.4rem+1.6vw,3rem)] ${n.kind === "quake" ? "text-[var(--cat-2)]" : "text-[var(--storm)]"}`}>
                {n.value}
              </dd>
              <dt className="text-sm text-muted">{n.label}</dt>
            </div>
          ))}
        </dl>

        <nav className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Explore">
          <Link href="/linog" className={`${linkTile} bg-foreground text-background hover:opacity-90`}>
            Earthquake map <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/bagyo" className={`${linkTile} bg-surface hover:bg-raised`}>
            Typhoon map <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/lugar" className={`${linkTile} bg-surface hover:bg-raised`}>
            My province <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/bagyo/retired" className={`${linkTile} bg-surface hover:bg-raised`}>
            Retired names <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </nav>
      </div>

      <figure className="relative overflow-hidden rounded-md bg-surface lg:col-span-5">
        <Link href="/linog" aria-label="Open the earthquake map" className="block h-full p-4">
          <QuakeDotsMap className="mx-auto h-full max-h-[78vh] w-full" />
        </Link>
        <figcaption className="absolute bottom-4 left-5 text-sm text-muted">Each dot is one M{MIN_MAG}+ earthquake (USGS)</figcaption>
      </figure>

      <section className={`${tile} lg:col-span-7`}>
        <h2 className="text-[1.75rem] leading-tight">Deadliest typhoons</h2>
        <ol className="mt-3">
          {deadliest.map((s) => (
            <li key={s.id}>
              <Link
                href={`/bagyo/${s.id}`}
                className="-mx-3 flex items-baseline gap-4 rounded px-3 py-3 hover:bg-raised focus-visible:bg-raised"
              >
                <span className="min-w-0 flex-1 truncate text-lg font-medium">
                  {s.local ?? s.name}
                  <span className="ml-2 text-sm font-normal text-muted">
                    {s.local && s.name ? `${s.name} · ` : ""}
                    {s.season}
                  </span>
                </span>
                <span className="num text-[1.75rem] text-[var(--storm)]">{formatNumber(s.phDeaths ?? 0)}</span>
                <span className="w-20 text-xs text-muted">dead in PH</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${tile} flex flex-col lg:col-span-5`}>
        <h2 className="text-[1.75rem] leading-tight">Storms per decade</h2>
        <div className="mt-4 flex min-h-40 flex-1 items-end gap-1.5" role="img" aria-label="Number of storms that entered the PAR in each decade since the 1940s">
          {decades.map(([d, n]) => (
            <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${d}s: ${n} storms`}>
              <span className="text-xs tabular-nums text-muted">{n}</span>
              <span className="w-full rounded-sm bg-[var(--storm)]" style={{ height: `${(n / maxDecade) * 100}%` }} />
              <span className="text-xs tabular-nums text-muted">{String(d).slice(2)}s</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
