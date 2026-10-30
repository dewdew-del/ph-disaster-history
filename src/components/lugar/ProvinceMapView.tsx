"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Feature } from "geojson";
import MagnitudeLegend from "@/components/map/MagnitudeLegend";
import MapLoading from "@/components/map/MapLoading";
import type { TrackInput } from "@/components/bagyo/TrackLayer";
import { loadDecadeTracks } from "@/lib/data-client";
import type { QuakeRow } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";

const ProvinceMap = dynamic(() => import("./ProvinceMap"), { ssr: false, loading: () => <MapLoading /> });

export type ShowMode = "both" | "quakes" | "storms";

type Props = {
  feature: Feature;
  bbox: [number, number, number, number];
  rows: QuakeRow[];
  name: string;
  /** Storms whose tracks are drawn (the deadliest ones). */
  storms: { id: string; label: string; season: number }[];
};

const MODES: [ShowMode, string][] = [
  ["both", "Both"],
  ["quakes", "Quakes"],
  ["storms", "Typhoons"],
];

export default function ProvinceMapView({ feature, bbox, rows, name, storms }: Props) {
  const dark = useIsDark();
  const [mode, setMode] = useState<ShowMode>("both");
  const [tracks, setTracks] = useState<TrackInput[]>([]);

  useEffect(() => {
    const decades = [...new Set(storms.map((s) => Math.floor(s.season / 10) * 10))];
    Promise.all(decades.map(loadDecadeTracks))
      .then((files) => {
        const all = Object.assign({}, ...files.map((f) => f.storms)) as Record<string, [number, number, number][]>;
        setTracks(storms.filter((s) => all[s.id]).map((s) => ({ id: s.id, label: s.label, points: all[s.id] })));
      })
      .catch(() => setTracks([]));
  }, [storms]);

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl bg-surface sm:h-[520px]">
      <ProvinceMap
        feature={feature}
        bbox={bbox}
        rows={mode === "storms" ? [] : rows}
        tracks={mode === "quakes" ? [] : tracks}
        dark={dark}
        landLabel={name}
        offshoreLabel={`Offshore, near ${name}`}
      />
      <div className="absolute left-3 top-3 z-[1000] flex rounded-xl bg-background p-1 shadow-sm" role="group" aria-label="Show on map">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-3.5 py-1.5 text-sm ${mode === m ? "bg-foreground font-semibold text-background" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode !== "storms" && (
        <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] max-w-[calc(100%-1.5rem)]">
          <MagnitudeLegend dark={dark} />
        </div>
      )}
    </div>
  );
}
