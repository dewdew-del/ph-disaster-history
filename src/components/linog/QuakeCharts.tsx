"use client";

import { useMemo } from "react";
import { ChartTable, ColumnChart, HorizontalBarChart, type BarDatum } from "@/components/charts/Bars";
import { MAG_BANDS, magColor, magStep, rampColor } from "@/lib/scales";
import { WHERE_OUTSIDE } from "@/lib/types";
import type { QuakeWithYear } from "./filters";

type Props = {
  quakes: QuakeWithYear[];
  provinceNames: string[];
  yearFrom: number;
  yearTo: number;
  dark: boolean;
};

export default function QuakeCharts({ quakes, provinceNames, yearFrom, yearTo, dark }: Props) {
  const { perYear, topProvinces, bands, ticks } = useMemo(() => {
    const years = new Map<number, number>();
    const provs = new Map<number, number>();
    const bandCounts = MAG_BANDS.map(() => 0);
    for (const q of quakes) {
      years.set(q.year, (years.get(q.year) ?? 0) + 1);
      if (q.where !== WHERE_OUTSIDE && q.prov >= 0) provs.set(q.prov, (provs.get(q.prov) ?? 0) + 1);
      bandCounts[magStep(q.mag)]++;
    }
    const perYear: BarDatum[] = [];
    for (let y = yearFrom; y <= yearTo; y++) perYear.push({ label: String(y), value: years.get(y) ?? 0 });
    const span = yearTo - yearFrom;
    const stepYears = span > 80 ? 25 : span > 40 ? 10 : span > 15 ? 5 : 1;
    const ticks = perYear.map((d) => d.label).filter((l) => Number(l) % stepYears === 0);
    const topProvinces: BarDatum[] = [...provs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([i, n]) => ({ label: provinceNames[i] ?? "?", value: n }));
    const bands: BarDatum[] = MAG_BANDS.map((b, i) => ({
      label: b.label,
      value: bandCounts[i],
      color: magColor(b.min, dark),
    }));
    return { perYear, topProvinces, bands, ticks };
  }, [quakes, provinceNames, yearFrom, yearTo, dark]);

  const barColor = rampColor(2, dark);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium">Quakes per year</h3>
        <ColumnChart data={perYear} dark={dark} color={barColor} unit="quakes" ticks={ticks} />
        <p className="text-xs text-muted">The jump around 1973 is better detection, not more quakes.</p>
      </section>
      <section>
        <h3 className="mb-1 text-sm font-medium">Top 10 provinces (on land + offshore nearby)</h3>
        {topProvinces.length > 0 ? (
          <>
            <HorizontalBarChart data={topProvinces} dark={dark} color={barColor} unit="quakes" />
            <ChartTable data={topProvinces} unit="quakes" />
          </>
        ) : (
          <p className="text-sm text-muted">No quakes near a province in this filter.</p>
        )}
      </section>
      <section>
        <h3 className="text-sm font-medium">By magnitude</h3>
        <ColumnChart data={bands} dark={dark} color={barColor} unit="quakes" height={140} />
        <ChartTable data={bands} unit="quakes" />
      </section>
    </div>
  );
}
