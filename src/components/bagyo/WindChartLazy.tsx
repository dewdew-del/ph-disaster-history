"use client";

import dynamic from "next/dynamic";
import type { TrackPoint } from "@/lib/types";

const WindChart = dynamic(() => import("./WindChart"), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-lg bg-foreground/5" />,
});

export default function WindChartLazy({ track }: { track: TrackPoint[] }) {
  return <WindChart track={track} />;
}
