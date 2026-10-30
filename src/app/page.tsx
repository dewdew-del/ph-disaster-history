import Link from "next/link";
import SiteSearch from "@/components/nav/SiteSearch";
import { getQuakesSummary, getSatellitePhotos, getTyphoonIndex } from "@/lib/data-server";
import { formatNumber } from "@/lib/format";
import { stormLabel } from "@/lib/types";

export default function Home() {
  const quakes = getQuakesSummary();
  const typhoons = getTyphoonIndex();
  const photos = getSatellitePhotos();
  const deadliest = typhoons.storms
    .filter((s) => s.phDeaths !== null)
    .sort((a, b) => (b.phDeaths ?? 0) - (a.phDeaths ?? 0))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-14 md:px-8">
      <section className="grid items-center gap-8 py-8 md:py-14 lg:grid-cols-2 lg:gap-12">
        <div>
          <h1 className="text-[clamp(2.1rem,1.3rem+3.6vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em]">
            Philippine quakes and typhoons
          </h1>
          <div className="mt-6 md:mt-8">
            <SiteSearch variant="hero" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:flex">
            <Link href="/linog" className="rounded-full bg-foreground px-6 py-3 text-center font-semibold text-background hover:opacity-90">
              <span className="sm:hidden">Earthquakes</span>
              <span className="hidden sm:inline">Explore earthquakes</span>
            </Link>
            <Link href="/bagyo" className="rounded-full bg-raised px-6 py-3 text-center font-semibold hover:bg-control">
              <span className="sm:hidden">Typhoons</span>
              <span className="hidden sm:inline">Explore typhoons</span>
            </Link>
          </div>
          <dl className="mt-8 flex gap-12">
            <div>
              <dd className="text-4xl font-bold leading-none tabular-nums">{formatNumber(quakes.total)}</dd>
              <dt className="mt-1.5 text-muted">Earthquakes</dt>
            </div>
            <div>
              <dd className="text-4xl font-bold leading-none tabular-nums">{formatNumber(typhoons.count)}</dd>
              <dt className="mt-1.5 text-muted">Typhoons</dt>
            </div>
          </dl>
        </div>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, image already sized */}
          <img
            src="/images/archive/damage-to-a-school-classroom-in-tacloban.min.jpg"
            alt="A classroom in Tacloban wrecked by Typhoon Yolanda, desks and chairs piled up in mud"
            width={640}
            height={480}
            className="h-[260px] w-full rounded-2xl object-cover sm:h-[440px]"
          />
          <figcaption className="mt-2 text-sm text-muted">Tacloban after Yolanda, 2013</figcaption>
        </figure>
      </section>

      <section className="pt-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold">Deadliest typhoons</h2>
          <Link href="/bagyo/retired" className="font-semibold text-accent hover:underline">
            View more →
          </Link>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {deadliest.map((s) => {
            const photo = photos[s.id];
            return (
              <li key={s.id}>
                <Link href={`/bagyo/${s.id}`} className="flex items-center gap-4 rounded-2xl bg-surface p-3 hover:bg-raised">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static export, image already sized
                    <img src={photo.file} alt="" loading="lazy" className="h-32 w-28 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="h-32 w-28 shrink-0 rounded-xl bg-raised" />
                  )}
                  <span>
                    <span className="block text-xl font-semibold leading-tight">{s.local ?? stormLabel(s)}</span>
                    <span className="block text-sm text-muted">{s.season}</span>
                    <span className="mt-2.5 block text-2xl font-bold leading-none tabular-nums">{formatNumber(s.phDeaths ?? 0)}</span>
                    <span className="block text-xs text-muted">dead in PH</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
