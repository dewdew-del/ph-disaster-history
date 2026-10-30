import Link from "next/link";
import ProvinceTeller, { type ProvinceFacts } from "@/components/home/ProvinceTeller";
import { getProvinceIndex, getQuakes, getQuakesSummary, getTyphoonDetail, getTyphoonIndex } from "@/lib/data-server";
import { fastYearPH, formatDatePH, formatNumber } from "@/lib/format";
import { provinceCounts, provinceQuakes, provinceStorms } from "@/lib/province-stats";
import { THUMB_H, THUMB_W, outlinePath, project, trackRuns, windArea } from "@/lib/thumbs";
import { stormLabel, toQuake, type Quake, type TyphoonDetail } from "@/lib/types";

// The contact sheet: storms PAGASA retired, each with its picture from space and its track and winds
// drawn from IBTrACS; and two strong earthquakes with photographs of what they did.
const STORMS: { id: string; img: string; w: number; alt: string }[] = [
  { id: "2013306N07162", img: "haiyan-2013-11-07-1345z-alternate-borderless.min.jpg", w: 343, alt: "Satellite image of Typhoon Haiyan near peak strength, November 7, 2013" },
  { id: "2011346N03156", img: "tropical-storm-washi-nasa-outline.min.jpg", w: 368, alt: "Satellite image of Tropical Storm Washi over Mindanao, December 2011" },
  { id: "2012331N03157", img: "bopha-2012-12-03-1712z-colored.min.jpg", w: 366, alt: "Night-time satellite image of Typhoon Bopha approaching Mindanao, December 3, 2012" },
  { id: "2021346N05145", img: "rai-2021-12-16-0159z.min.jpg", w: 384, alt: "Satellite image of Typhoon Rai over the Visayas, December 16, 2021" },
  { id: "2009268N14128", img: "typhoon-ketsana-2009-09-28-0330z.min.jpg", w: 369, alt: "Satellite image of Typhoon Ketsana after crossing Luzon, September 28, 2009" },
  { id: "2020299N11144", img: "goni-2020-10-31-1745z-large.min.jpg", w: 535, alt: "Satellite image of Super Typhoon Goni at landfall in Catanduanes, October 31, 2020" },
  { id: "2020313N08135", img: "vamco-2020-11-11-0505z.min.jpg", w: 446, alt: "Satellite image of Typhoon Vamco over Luzon, November 11, 2020" },
  { id: "1995293N05177", img: "angela-1995-11-01-0631z.min.jpg", w: 360, alt: "Satellite image of Super Typhoon Angela east of the Philippines, November 1, 1995" },
];

const QUAKES: { title: string; date: string; minMag: number; photos: { img: string; w: number; alt: string }[]; line: string }[] = [
  {
    title: "1990 Luzon earthquake",
    date: "1990-07-16",
    minMag: 7.5,
    photos: [
      { img: "hyatt-terraces-baguio-16-july-1990-earthquake.min.jpg", w: 720, alt: "The collapsed Hyatt Terraces hotel in Baguio after the July 16, 1990 earthquake" },
    ],
    line: "Collapsed hotels in Baguio and buildings across Central Luzon.",
  },
  {
    title: "2013 Bohol earthquake",
    date: "2013-10-15",
    minMag: 7,
    photos: [
      { img: "santa-cruz-parish-church-maribojoc-bohol-before.min.jpg", w: 320, alt: "Santa Cruz Parish Church in Maribojoc, Bohol, before and after the 2013 earthquake" },
      { img: "baclayon-church-rehab.min.jpg", w: 640, alt: "Baclayon Church in Bohol under repair after the 2013 earthquake" },
    ],
    line: "Centuries-old stone churches of Bohol fell or cracked.",
  },
];

const FRAME_H = 168; // all frames share one height (120px on phones); widths follow each picture

function CatPath({ d, cat, w = 2.2 }: { d: string; cat: number; w?: number }) {
  return <path d={d} fill="none" stroke={cat < 0 ? "var(--cat-u)" : `var(--cat-${cat})`} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
}

function TrackFrame({ s }: { s: TyphoonDetail }) {
  const runs = trackRuns(s.track);
  return (
    <svg
      viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
      height={FRAME_H}
      width={Math.round((FRAME_H * THUMB_W) / THUMB_H)}
      className="frame block h-[120px] w-auto shrink-0 bg-surface sm:h-[168px]"
      role="img"
      aria-label={`Track of ${stormLabel(s)} across the Philippines, colored by strength`}
    >
      <path d={outlinePath()} fill="var(--muted)" opacity="0.35" />
      {runs.map((r, i) => (
        <CatPath key={i} d={r.d} cat={r.cat} />
      ))}
    </svg>
  );
}

function WindFrame({ s }: { s: TyphoonDetail }) {
  const w = 100;
  const h = 100;
  const { area, line } = windArea(s.track, w, h);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      height={FRAME_H}
      width={Math.round((FRAME_H * w) / h)}
      preserveAspectRatio="none"
      className="frame block h-[120px] min-w-[120px] flex-1 bg-surface sm:h-[168px]"
      role="img"
      aria-label={`Wind speed of ${stormLabel(s)} over its lifetime, peaking at ${s.kmh ?? "unknown"} km/h`}
    >
      <path d={area} fill="var(--cat-3)" opacity="0.85" />
      <path d={line} fill="none" stroke="var(--cat-4)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function EpicenterFrame({ q }: { q: Quake }) {
  const [x, y] = project(q.lat, q.lon);
  return (
    <svg
      viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
      height={FRAME_H}
      width={Math.round((FRAME_H * THUMB_W) / THUMB_H)}
      className="frame block h-[120px] w-auto shrink-0 bg-surface sm:h-[168px]"
      role="img"
      aria-label={`Epicentre of the M${q.mag.toFixed(1)} earthquake, ${q.place}`}
    >
      <path d={outlinePath()} fill="var(--muted)" opacity="0.35" />
      <circle cx={x} cy={y} r={11} fill="var(--cat-3)" opacity="0.35" />
      <circle cx={x} cy={y} r={4.5} fill="var(--cat-4)" />
    </svg>
  );
}

function Photo({ img, w, alt, eager = false }: { img: string; w: number; alt: string; eager?: boolean }) {
  // Each file is 480px tall (or less); width follows its own ratio.
  const width = Math.round((FRAME_H * w) / 480);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/archive/${img}`}
      alt={alt}
      height={FRAME_H}
      width={width}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className="frame block h-[120px] w-auto shrink-0 object-cover sm:h-[168px]"
    />
  );
}

function findQuake(date: string, minMag: number): Quake | null {
  const quakes = getQuakes();
  const from = Date.parse(`${date}T00:00:00Z`) / 1000;
  const row = quakes.rows.find((r) => r[1] >= from && r[1] < from + 86400 && r[2] >= minMag);
  return row ? toQuake(row) : null;
}

export default function Home() {
  const summary = getQuakesSummary();
  const typhoons = getTyphoonIndex();
  const storms = STORMS.map((s) => ({ ...s, detail: getTyphoonDetail(s.id) }));
  const quakeRuns = QUAKES.map((q) => ({ ...q, quake: findQuake(q.date, q.minMag) }));
  const superTyphoons = typhoons.storms.filter((s) => s.cat === "STY").length;
  const named = typhoons.storms.filter((s) => s.local).length;
  const counts = provinceCounts();
  const provinces = getProvinceIndex();
  const mostHit = [...provinces].sort((a, b) => (counts[b.slug]?.storms ?? 0) - (counts[a.slug]?.storms ?? 0))[0];
  const deadliest = typhoons.storms
    .filter((s) => s.phDeaths !== null)
    .sort((a, b) => (b.phDeaths ?? 0) - (a.phDeaths ?? 0))
    .slice(0, 10);

  const facts: ProvinceFacts[] = provinces.map((p) => {
    const q = provinceQuakes(p.slug);
    const strongest = q.reduce<Quake | null>((best, x) => (!best || x.mag > best.mag ? x : best), null);
    const worst = provinceStorms(p.slug)
      .filter((s) => s.phDeaths !== null)
      .sort((a, b) => (b.phDeaths ?? 0) - (a.phDeaths ?? 0))[0];
    return {
      slug: p.slug,
      name: p.name,
      region: p.region,
      storms: counts[p.slug]?.storms ?? 0,
      quakes: counts[p.slug]?.quakes ?? 0,
      strongestMag: strongest?.mag ?? null,
      strongestYear: strongest ? fastYearPH(strongest.time) : null,
      deadliest: worst ? `${stormLabel(worst)}, ${worst.season}` : null,
    };
  });

  const figures: [string, string][] = [
    [formatNumber(summary.total), "earthquakes of M4.5 or more since 1900, in and around the Philippines"],
    [formatNumber(summary.m6), "of them were M6 or stronger"],
    [formatNumber(typhoons.count), `storms entered the Philippine Area of Responsibility since ${typhoons.firstSeason}`],
    [formatNumber(superTyphoons), "reached super typhoon strength (185 km/h or more, 10-minute wind)"],
    [formatNumber(counts[mostHit.slug]?.storms ?? 0), `passed over or near ${mostHit.name}, more than any other province`],
    [formatNumber(named), "have a PAGASA local name on record"],
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-8">
      {/* First screen: the name, what this is, where to go, and the sheet starting below. */}
      <section className="pt-10 md:pt-14" aria-labelledby="title">
        <h1 id="title" className="rise text-[clamp(2.75rem,8.2vw,8rem)] font-bold leading-[0.92] tracking-[-0.035em]">
          PH Disaster History
        </h1>
        <p className="rise mt-6 max-w-[46rem] text-[clamp(1.125rem,1rem+0.6vw,1.5rem)] leading-snug" style={{ ["--i" as string]: 1 }}>
          Where strong earthquakes hit the Philippines most often, and every typhoon that entered the PAR since 1945, with
          its PAGASA name, track, strength and damage.
        </p>
        <a
          href="#your-province"
          className="rise mt-8 inline-block bg-accent px-6 py-3.5 text-lg font-medium text-white transition-transform hover:opacity-90 active:scale-[0.98] dark:text-slate-900"
          style={{ ["--i" as string]: 2 }}
        >
          Look up your province
        </a>
        <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["/linog", "Linog · Earthquakes", `${formatNumber(summary.total)} earthquakes since 1900 on one map, with a heatmap of where they hit most.`],
            ["/bagyo", "Bagyo · Typhoons", `${formatNumber(typhoons.count)} storms with tracks, winds, local names, deaths and damage.`],
            ["/lugar", "My Province", `${provinces.length} provinces, each with its own quake and typhoon history.`],
            ["/bagyo/retired", "Retired names", "The names PAGASA will never use again, and why."],
          ].map(([href, title, text], i) => (
            <Link key={href} href={href} className="rise group block" style={{ ["--i" as string]: i + 3 }}>
              <span className="text-lg font-semibold text-accent group-hover:underline">{title} →</span>
              <span className="mt-1 block text-base leading-relaxed">{text}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* The contact sheet */}
      <section className="mt-16 md:mt-20" aria-labelledby="sheet-title">
        <h2 id="sheet-title" className="text-[clamp(1.75rem,1.2rem+2.4vw,3.25rem)] font-bold leading-none tracking-[-0.03em]">
          Storms that changed the list
        </h2>
        <p className="mt-3 max-w-[44rem] text-base">
          PAGASA retired each of these names after the storm. Every run shows the storm from space, then its track and
          its winds drawn from IBTrACS. Below them, two earthquakes that people still talk about.
        </p>
        <div className="sheet mt-8 grid gap-x-10 gap-y-9 lg:grid-cols-2">
          {storms.map(({ detail: s, img, w, alt }, i) => (
            <Link key={s.id} href={`/bagyo/${s.id}`} className="run rise-view block focus-visible:outline-offset-4">
              <span className="block text-base">
                <span className="font-semibold">
                  {stormLabel(s)}, {s.season}
                </span>
                <span className="text-muted">
                  {" "}
                  · {s.kmh ?? "?"} km/h peak · {s.damage?.phDeaths !== null && s.damage?.phDeaths !== undefined ? `${formatNumber(s.damage.phDeaths)} deaths in PH` : "deaths not curated"}
                </span>
              </span>
              <span className="mt-2 flex flex-wrap gap-2">
                <Photo img={img} w={w} alt={alt} eager={i < 2} />
                <TrackFrame s={s} />
                <WindFrame s={s} />
              </span>
            </Link>
          ))}
          {quakeRuns.map((r) =>
            r.quake ? (
              <a
                key={r.title}
                href={`https://earthquake.usgs.gov/earthquakes/eventpage/${r.quake.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="run rise-view block focus-visible:outline-offset-4"
              >
                <span className="block text-base">
                  <span className="font-semibold">
                    {r.title}, M{r.quake.mag.toFixed(1)}
                  </span>
                  <span className="text-muted">
                    {" "}
                    · {formatDatePH(r.quake.time)} · {r.line}
                  </span>
                </span>
                <span className="mt-2 flex flex-wrap gap-2">
                  {r.photos.map((p) => (
                    <Photo key={p.img} {...p} />
                  ))}
                  <EpicenterFrame q={r.quake} />
                </span>
              </a>
            ) : null,
          )}
        </div>
        <p className="mt-6 text-sm text-muted">
          Pictures via Wikimedia Commons: satellite images by NASA and NOAA (public domain) and Chiba University (CC0), PHIVOLCS (public domain),
          Joelaldor (CC BY-SA 4.0), Lawrence Ruiz (CC BY-SA 4.0).{" "}
          <Link href="/sources#pictures" className="text-accent underline">
            Full credits
          </Link>
        </p>
      </section>

      {/* The live thing */}
      <section id="your-province" className="mt-24 bg-surface px-5 py-14 md:mt-32 md:px-12 md:py-20" aria-labelledby="teller-title">
        <h2 id="teller-title" className="text-[clamp(1.75rem,1.2rem+2.4vw,3.25rem)] font-bold leading-none tracking-[-0.03em]">
          Your province
        </h2>
        <div className="mt-8">
          <ProvinceTeller provinces={facts} initial="leyte" />
        </div>
        <noscript>
          <p className="mt-4">
            <Link href="/lugar" className="text-accent underline">
              Pick your province on the My Province page
            </Link>
          </p>
        </noscript>
      </section>

      {/* Figures and the deadliest list, side by side on desktop */}
      <section className="mt-24 grid gap-16 md:mt-32 lg:grid-cols-2" aria-label="The record in numbers">
        <div>
          <h2 className="text-[clamp(1.75rem,1.2rem+2.4vw,3.25rem)] font-bold leading-none tracking-[-0.03em]">In numbers</h2>
          <ul className="mt-8">
            {figures.map(([n, text]) => (
              <li key={text} className="rise-view py-3 text-xl leading-snug odd:bg-surface sm:px-3">
                <strong className="font-bold tabular-nums">{n}</strong> {text}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[clamp(1.75rem,1.2rem+2.4vw,3.25rem)] font-bold leading-none tracking-[-0.03em]">
            Deadliest typhoons
          </h2>
          <ol className="mt-8">
            {deadliest.map((s) => (
              <li key={s.id} className="rise-view odd:bg-surface">
                <Link href={`/bagyo/${s.id}`} className="flex items-baseline justify-between gap-4 px-3 py-3 hover:text-accent">
                  <span className="text-lg font-medium">
                    {stormLabel(s)} <span className="text-muted">{s.season}</span>
                  </span>
                  <span className="text-lg tabular-nums">{formatNumber(s.phDeaths ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            Deaths in the Philippines, from the retired-names list (PAGASA, NDRRMC).{" "}
            <Link href="/bagyo/retired" className="text-accent underline">
              All retired names
            </Link>
          </p>
        </div>
      </section>

      <section className="mb-20 mt-24 md:mt-32" aria-labelledby="about-title">
        <h2 id="about-title" className="text-[clamp(1.75rem,1.2rem+2.4vw,3.25rem)] font-bold leading-none tracking-[-0.03em]">
          About this project
        </h2>
        <div className="mt-6 grid gap-8 text-lg leading-relaxed md:grid-cols-2">
          <p>
            Earthquakes come from the USGS catalog, typhoon tracks from NOAA&apos;s IBTrACS, and local names, deaths and
            damage from Wikipedia, all prepared into small static files. USGS magnitudes can differ a little from
            PHIVOLCS, and storm strength uses the PAGASA scale on 10-minute winds.
          </p>
          <p>
            It is a history, not a warning service. For live alerts, follow{" "}
            <a href="https://www.phivolcs.dost.gov.ph/" className="text-accent underline">
              PHIVOLCS
            </a>{" "}
            and{" "}
            <a href="https://www.pagasa.dost.gov.ph/" className="text-accent underline">
              PAGASA
            </a>
            . Every number links back to its source on the{" "}
            <Link href="/sources" className="text-accent underline">
              sources page
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
