"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import MapLoading from "@/components/map/MapLoading";
import { loadJson } from "@/lib/data-client";
import { formatNumber } from "@/lib/format";
import { rampColor } from "@/lib/scales";
import type { ProvinceCounts } from "@/lib/province-stats";
import type { ProvinceInfo } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";

const ProvincesMap = dynamic(() => import("./ProvincesMap"), { ssr: false, loading: () => <MapLoading /> });

/** With fewer than 5 classes, skip the lightest ramp steps so the top class stays darkest. */
const classColorStep = (i: number, classes: number) => i + (5 - classes);

type Metric = "storms" | "quakes";
type SortKey = "name" | "storms" | "quakes";

type Props = { provinces: ProvinceInfo[]; counts: Record<string, ProvinceCounts> };

/** Up to 5 classes from quantiles (duplicates merged), so the colors spread across the provinces. */
function quantileBreaks(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const raw = [0.2, 0.4, 0.6, 0.8, 1].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))]);
  return [...new Set(raw)];
}

export default function LugarPicker({ provinces, counts }: Props) {
  const router = useRouter();
  const dark = useIsDark();
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [metric, setMetric] = useState<Metric>("storms");
  const [sort, setSort] = useState<SortKey>("storms");

  useEffect(() => {
    loadJson<FeatureCollection>("/data/provinces.json")
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const values = useMemo(
    () => Object.fromEntries(provinces.map((p) => [p.slug, counts[p.slug]?.[metric] ?? 0])),
    [provinces, counts, metric],
  );
  const breaks = useMemo(() => quantileBreaks(Object.values(values)), [values]);

  const regions = useMemo(() => {
    const m = new Map<string, ProvinceInfo[]>();
    for (const p of provinces) {
      if (!m.has(p.region)) m.set(p.region, []);
      m.get(p.region)!.push(p);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [provinces]);

  const rows = useMemo(() => {
    const list = provinces.map((p) => ({ ...p, ...(counts[p.slug] ?? { quakes: 0, m6: 0, storms: 0 }) }));
    return list.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b[sort] - a[sort]));
  }, [provinces, counts, sort]);

  const unit = metric === "storms" ? "storms in path area" : "quakes M4.5+";
  const legend = breaks.map((b, i) => ({
    to: b,
    from: i === 0 ? 0 : breaks[i - 1] + 1,
    color: rampColor(classColorStep(i, breaks.length), dark),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-3xl font-bold tracking-tight">My Province</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Pick a province to see its earthquakes and the typhoons whose path passed over or near it.
      </p>

      <label className="mt-4 block max-w-md">
        <span className="text-sm font-medium">Province</span>
        <select
          className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2"
          defaultValue=""
          onChange={(e) => e.target.value && router.push(`/lugar/${e.target.value}`)}
        >
          <option value="" disabled>
            Choose a province…
          </option>
          {regions.map(([region, list]) => (
            <optgroup key={region} label={region}>
              {list.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">Or tap a province on the map.</p>
            <div className="flex overflow-hidden rounded-lg border border-border text-sm" role="group" aria-label="Color by">
              {(["storms", "quakes"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={metric === m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1.5 ${metric === m ? "bg-accent text-white dark:text-slate-900" : "hover:bg-foreground/5"}`}
                >
                  {m === "storms" ? "Typhoons" : "Earthquakes"}
                </button>
              ))}
            </div>
          </div>
          <div className="relative h-[70dvh] min-h-[420px] overflow-hidden rounded-xl border border-border">
            {geo ? (
              <ProvincesMap
                provinces={geo}
                values={values}
                breaks={breaks}
                label={unit}
                dark={dark}
                onPick={(slug) => router.push(`/lugar/${slug}`)}
              />
            ) : (
              <MapLoading />
            )}
            <div className="pointer-events-none absolute bottom-6 left-2 z-[1000] rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm">
              <div className="mb-1 font-medium">{metric === "storms" ? "Storms in path area, 1945–now" : "Quakes M4.5+, 1900–now"}</div>
              <ul className="space-y-0.5">
                {legend.map((l) => (
                  <li key={l.to} className="flex items-center gap-2">
                    <span aria-hidden className="inline-block h-3 w-4 rounded-sm" style={{ background: l.color }} />
                    <span className="tabular-nums text-muted">
                      {formatNumber(l.from)}–{formatNumber(l.to)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">All provinces</h2>
          <div className="mt-2 max-h-[70dvh] overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted">
                <tr>
                  {(
                    [
                      ["name", "Province"],
                      ["storms", "Storms"],
                      ["quakes", "Quakes"],
                    ] as const
                  ).map(([k, label]) => (
                    <th key={k} className={`px-3 py-2 font-medium ${k !== "name" ? "text-right" : ""}`}>
                      <button
                        type="button"
                        onClick={() => setSort(k)}
                        className={sort === k ? "text-foreground underline" : "hover:text-foreground"}
                      >
                        {label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr key={p.slug}>
                    <td className="px-3 py-1.5">
                      <Link href={`/lugar/${p.slug}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(p.storms)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(p.quakes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Storms: path within ~50 km (approximate). Quakes: on land or offshore within 100 km.
          </p>
        </section>
      </div>
    </div>
  );
}
