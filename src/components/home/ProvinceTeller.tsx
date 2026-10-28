"use client";

import Link from "next/link";
import { useState } from "react";

export type ProvinceFacts = {
  slug: string;
  name: string;
  region: string;
  storms: number;
  quakes: number;
  strongestMag: number | null;
  strongestYear: number | null;
  deadliest: string | null;
};

const nf = (n: number) => n.toLocaleString("en-US");

/** The page's one live thing: pick a province, read its own history in two sentences. */
export default function ProvinceTeller({ provinces, initial }: { provinces: ProvinceFacts[]; initial: string }) {
  const [slug, setSlug] = useState(initial);
  const p = provinces.find((x) => x.slug === slug) ?? provinces[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
      <label className="block">
        <span className="text-base font-medium">Choose a province</span>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-2 w-full rounded-none border-2 border-foreground/20 bg-card px-3 py-3 text-lg focus:border-accent focus:outline-none"
        >
          {provinces.map((x) => (
            <option key={x.slug} value={x.slug}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <div aria-live="polite">
        <p className="max-w-[40rem] text-[clamp(1.25rem,1.05rem+0.9vw,1.875rem)] font-medium leading-snug tracking-tight">
          {p.name}: in the path of <span className="tabular-nums">{nf(p.storms)}</span> typhoons since 1945, and{" "}
          <span className="tabular-nums">{nf(p.quakes)}</span> earthquakes of M4.5+ since 1900.
        </p>
        <p className="mt-4 max-w-[40rem] text-lg">
          {p.strongestMag !== null ? <>Strongest quake: M{p.strongestMag.toFixed(1)} in {p.strongestYear}. </> : null}
          {p.deadliest ? <>Deadliest storm on its path: {p.deadliest}.</> : null}
        </p>
        <Link
          href={`/lugar/${p.slug}`}
          className="mt-6 inline-block bg-accent px-5 py-3 font-medium text-white transition-transform hover:opacity-90 active:scale-[0.98] dark:text-slate-900"
        >
          Open {p.name}&apos;s page
        </Link>
      </div>
    </div>
  );
}
