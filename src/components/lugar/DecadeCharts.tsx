"use client";

import dynamic from "next/dynamic";
import type { BarDatum } from "@/components/charts/Bars";
import { rampColor } from "@/lib/scales";
import { useIsDark } from "@/lib/useIsDark";

const ColumnChart = dynamic(() => import("@/components/charts/Bars").then((m) => m.ColumnChart), {
  ssr: false,
  loading: () => <div className="h-[150px] animate-pulse rounded-lg bg-foreground/5" />,
});

type Props = { storms: BarDatum[]; quakes: BarDatum[] };

export default function DecadeCharts({ storms, quakes }: Props) {
  const dark = useIsDark();
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section>
        <h3 className="text-sm font-medium">Storms per decade (path area)</h3>
        <ColumnChart data={storms} dark={dark} color={rampColor(2, dark)} unit="storms" height={150} />
      </section>
      <section>
        <h3 className="text-sm font-medium">Quakes M4.5+ per decade</h3>
        <ColumnChart data={quakes} dark={dark} color={rampColor(2, dark)} unit="quakes" height={150} />
        <p className="text-xs text-muted">Before 1973 the catalog mostly lists bigger quakes.</p>
      </section>
    </div>
  );
}
