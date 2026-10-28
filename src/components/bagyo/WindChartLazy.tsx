"use client";

import dynamic from "next/dynamic";
import LazyVisible from "@/components/ui/LazyVisible";
import type { TrackPoint } from "@/lib/types";

const WindChart = dynamic(() => import("./WindChart"), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-lg bg-foreground/5" />,
});

/** The chart's code loads only when it scrolls near the screen (keeps the first load light). */
export default function WindChartLazy({ track }: { track: TrackPoint[] }) {
  return (
    <LazyVisible minHeight={240}>
      <WindChart track={track} />
    </LazyVisible>
  );
}
