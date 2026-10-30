"use client";

// Loaded with next/dynamic { ssr: false } from LinogExplorer (Leaflet needs `window`).
import BaseMap from "@/components/map/BaseMap";
import HeatLayer from "./HeatLayer";
import QuakeLayer from "./QuakeLayer";
import type { Quake } from "@/lib/types";

export type MapMode = "dots" | "heat";

type Props = {
  quakes: Quake[];
  dark: boolean;
  mode: MapMode;
  provinceLabel?: (q: Quake) => string | undefined;
  focus?: { id: string; n: number } | null;
  onSelect?: (q: Quake) => void;
  selectedId?: string | null;
};

export default function LinogMap({ quakes, dark, mode, provinceLabel, focus, onSelect, selectedId }: Props) {
  return (
    <BaseMap>
      {mode === "dots" ? (
        <QuakeLayer quakes={quakes} dark={dark} provinceLabel={provinceLabel} focus={focus} onSelect={onSelect} selectedId={selectedId} />
      ) : (
        <HeatLayer quakes={quakes} dark={dark} />
      )}
    </BaseMap>
  );
}
