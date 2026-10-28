"use client";

// Loaded with next/dynamic { ssr: false } from LugarPicker (Leaflet needs `window`).
import { useMemo } from "react";
import { GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { Layer, LeafletMouseEvent, Path } from "leaflet";
import BaseMap from "@/components/map/BaseMap";
import { rampColor } from "@/lib/scales";

type Props = {
  provinces: FeatureCollection;
  /** slug -> value used for the choropleth */
  values: Record<string, number>;
  /** ascending upper bounds of the 5 color classes */
  breaks: number[];
  label: string;
  dark: boolean;
  onPick: (slug: string) => void;
};

export function classOf(v: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i++) if (v <= breaks[i]) return i;
  return breaks.length - 1;
}

export default function ProvincesMap({ provinces, values, breaks, label, dark, onPick }: Props) {
  const key = useMemo(() => `${label}-${dark}`, [label, dark]);
  const border = dark ? "#0b1220" : "#ffffff";

  return (
    <BaseMap>
      <GeoJSON
        key={key}
        data={provinces}
        style={(f?: Feature) => {
          const v = values[String(f?.properties?.slug)] ?? 0;
          const step = classOf(v, breaks) + (5 - breaks.length);
          return { color: border, weight: 0.8, fillColor: rampColor(step, dark), fillOpacity: 0.75 };
        }}
        onEachFeature={(f: Feature, layer: Layer) => {
          const slug = String(f.properties?.slug);
          const name = String(f.properties?.name);
          layer.bindTooltip(`<strong>${name}</strong><br/>${(values[slug] ?? 0).toLocaleString("en-US")} ${label}`, {
            sticky: true,
          });
          layer.on({
            click: () => onPick(slug),
            mouseover: (e: LeafletMouseEvent) => (e.target as Path).setStyle({ weight: 2.5, color: dark ? "#5eead4" : "#0f766e" }),
            mouseout: (e: LeafletMouseEvent) => (e.target as Path).setStyle({ weight: 0.8, color: border }),
          });
        }}
      />
    </BaseMap>
  );
}
