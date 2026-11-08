import Link from "next/link";
import QuakeDotsMap from "@/components/home/QuakeDotsMap";
import { getQuakes, getQuakesSummary, getTyphoonIndex } from "@/lib/data-server";
import { fastYearPH, formatMag, formatNumber } from "@/lib/format";

// Home is a board of flat tiles fitted edge to edge: name, map, four numbers, four links, the deadliest list, storms per decade.
const tile = "rounded-md bg-surface p-5 md:p-6";

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
    { value: formatNumber(quakes.total), label: "quakes since 1900", kind: "quake" },
    { value: formatNumber(typhoons.count), label: "typhoons since 1945", kind: "storm" },
    { value: formatMag(strongest[2]), label: `strongest, ${fastYearPH(strongest[1])}`, kind: "quake" },
    { value: formatNumber(deadliest[0]?.phDeaths ?? 0), label: `dead, ${deadliest[0]?.local ?? "Yolanda"}`, kind: "storm" },
  ];

  return (
    <div className="mx-auto grid max-w-[1440px] gap-2 px-2 pb-12 pt-2 md:px-4 lg:grid-cols-12">
      <section className="relative overflow-hidden lg:col-span-12 lg:min-h-[calc(100dvh-4.5rem)]">
        {/* The map is the background; the text floats over the open sea west of the islands. */}
        <QuakeDotsMap className="pointer-events-none absolute -top-[4%] right-0 h-[108%] w-full opacity-30 sm:opacity-50 lg:right-[2%] lg:w-[64%] lg:opacity-100" />
        <div className="relative flex flex-col gap-8 px-3 py-10 md:px-6 md:py-14 lg:max-w-[52%] lg:py-20">
          <h1 className="text-[clamp(2.4rem,1.4rem+3.6vw,4.75rem)] leading-[1.02]">Where the Philippines shakes and the storms come in</h1>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {numbers.map((n) => (
              <div key={n.label} className="flex flex-col gap-1">
                <dd className={`text-[1.75rem] font-semibold leading-tight tabular-nums tracking-tight ${n.kind === "quake" ? "text-[var(--cat-2)]" : "text-[var(--storm)]"}`}>
                  {n.value}
                </dd>
                <dt className="text-sm leading-snug text-muted">{n.label}</dt>
              </div>
            ))}
          </dl>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3" aria-label="Explore">
            <Link href="/linog" className="group inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-3 font-medium text-background hover:opacity-90">
              Earthquake map <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/bagyo" className="font-medium underline decoration-[1.5px] underline-offset-[6px] hover:no-underline">
              Typhoon map
            </Link>
          </nav>
        </div>
      </section>

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
