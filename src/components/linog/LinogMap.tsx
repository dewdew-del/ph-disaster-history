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
};

export default function LinogMap({ quakes, dark, mode, provinceLabel, focus }: Props) {
  return (
    <BaseMap>
      {mode === "dots" ? (
        <QuakeLayer quakes={quakes} dark={dark} provinceLabel={provinceLabel} focus={focus} />
      ) : (
        <HeatLayer quakes={quakes} dark={dark} />
      )}
    </BaseMap>
  );
}
