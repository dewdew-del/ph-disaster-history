"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChartTable, ColumnChart, type BarDatum } from "@/components/charts/Bars";
import { formatNumber } from "@/lib/format";
import { rampColor } from "@/lib/scales";
import { stormLabel, type TyphoonSummary } from "@/lib/types";

type Props = { filtered: TyphoonSummary[]; all: TyphoonSummary[]; dark: boolean };

export default function BagyoStats({ filtered, all, dark }: Props) {
  const perYear = useMemo<BarDatum[]>(() => {
    if (filtered.length === 0) return [];
    const counts = new Map<number, number>();
    for (const s of filtered) counts.set(s.season, (counts.get(s.season) ?? 0) + 1);
    const first = Math.min(...counts.keys());
    const last = Math.max(...counts.keys());
    const out: BarDatum[] = [];
    for (let y = first; y <= last; y++) out.push({ label: String(y), value: counts.get(y) ?? 0 });
    return out;
  }, [filtered]);

  const ticks = useMemo(() => {
    const span = perYear.length;
    const step = span > 50 ? 20 : span > 20 ? 10 : span > 10 ? 5 : 1;
    return perYear.map((d) => d.label).filter((l) => Number(l) % step === 0);
  }, [perYear]);

  // Curated only: storms with a verified PH-only death count (data/overrides.csv, field ph_deaths).
  const deadliest = useMemo(
    () =>
      all
        .filter((s) => s.phDeaths !== null)
        .sort((a, b) => (b.phDeaths ?? 0) - (a.phDeaths ?? 0))
        .slice(0, 10),
    [all],
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium">Storms per year (current filters)</h3>
        {perYear.length ? (
          <>
            <ColumnChart data={perYear} dark={dark} color={rampColor(2, dark)} unit="storms" ticks={ticks} />
            <ChartTable data={perYear} unit="storms" />
          </>
        ) : (
          <p className="text-sm text-muted">No storms match the filters.</p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium">Deadliest in the Philippines</h3>
        <p className="mb-2 text-xs text-muted">
          Curated list: only storms with a checked PH-only death count, each with a source.
        </p>
        {deadliest.length ? (
          <ol className="divide-y divide-border">
            {deadliest.map((s, i) => (
              <li key={s.id} className="flex items-baseline gap-2 py-1.5 text-sm">
                <span className="w-5 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                <Link href={`/bagyo/${s.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {stormLabel(s)}, {s.season}
                </Link>
                <span className="shrink-0 tabular-nums">{formatNumber(s.phDeaths ?? 0)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">No curated death counts yet.</p>
        )}
      </section>
    </div>
  );
}
