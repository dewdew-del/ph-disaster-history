"use client";

// Loaded with next/dynamic { ssr: false } from LinogExplorer (Leaflet needs `window`).
import BaseMap from "@/components/map/BaseMap";
import QuakeLayer from "./QuakeLayer";
import type { Quake } from "@/lib/types";

type Props = {
  quakes: Quake[];
  dark: boolean;
  provinceLabel?: (q: Quake) => string | undefined;
  focus?: { id: string; n: number } | null;
};

export default function LinogMap({ quakes, dark, provinceLabel, focus }: Props) {
  return (
    <BaseMap>
      <QuakeLayer quakes={quakes} dark={dark} provinceLabel={provinceLabel} focus={focus} />
    </BaseMap>
  );
}
