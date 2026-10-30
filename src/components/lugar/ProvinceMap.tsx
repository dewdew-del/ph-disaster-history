"use client";

// Loaded with next/dynamic { ssr: false } from ProvinceMapView (Leaflet needs `window`).
import { useMemo } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import { GeoJSON } from "react-leaflet";
import type { Feature } from "geojson";
import BaseMap from "@/components/map/BaseMap";
import QuakeLayer from "@/components/linog/QuakeLayer";
import { toQuake, type QuakeRow } from "@/lib/types";

type Props = {
  feature: Feature;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  rows: QuakeRow[];
  dark: boolean;
  offshoreLabel: string;
  landLabel: string;
};

export default function ProvinceMap({ feature, bbox, rows, dark, offshoreLabel, landLabel }: Props) {
  const quakes = useMemo(() => rows.map(toQuake), [rows]);
  const highlight = dark ? "#f1f2f4" : "#15171a";
  const label = useMemo(() => (q: { where: number }) => (q.where === 0 ? landLabel : offshoreLabel), [landLabel, offshoreLabel]);
  // Province box plus ~half its size around it, so nearby offshore quakes are in view too.
  const bounds: LatLngBoundsExpression = useMemo(() => {
    const [w, s, e, n] = bbox;
    const padLon = Math.max(0.4, (e - w) * 0.4);
    const padLat = Math.max(0.4, (n - s) * 0.4);
    return [
      [s - padLat, w - padLon],
      [n + padLat, e + padLon],
    ];
  }, [bbox]);

  return (
    <BaseMap bounds={bounds}>
      <GeoJSON
        key={String(dark)}
        data={feature}
        interactive={false}
        style={{ color: highlight, weight: 2, fillColor: highlight, fillOpacity: dark ? 0.18 : 0.12 }}
      />
      <QuakeLayer quakes={quakes} dark={dark} provinceLabel={label} />
    </BaseMap>
  );
}
