"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import type { Quake } from "@/lib/types";

// Same orange ramp as the markers, light -> dark = few -> many quakes.
const GRADIENT_LIGHT = { 0.25: "#fdba74", 0.45: "#fb923c", 0.65: "#ea580c", 0.85: "#c2410c", 1: "#6c2410" };
const GRADIENT_DARK = { 0.25: "#9a3412", 0.45: "#c2410c", 0.65: "#ea580c", 0.85: "#fb923c", 1: "#fed7aa" };

/** Heatmap of quake density ("where it hits most often"), via leaflet.heat. */
export default function HeatLayer({ quakes, dark }: { quakes: Quake[]; dark: boolean }) {
  const map = useMap();

  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;
    // leaflet.heat is an old plugin that expects a global `L`.
    (window as unknown as { L: typeof L }).L = L;
    import("leaflet.heat").then(() => {
      if (cancelled) return;
      const points = quakes.map((q) => [q.lat, q.lon, 1] as L.HeatLatLngTuple);
      layer = L.heatLayer(points, {
        radius: 12,
        blur: 15,
        maxZoom: 11,
        minOpacity: 0.3,
        max: 3,
        gradient: dark ? GRADIENT_DARK : GRADIENT_LIGHT,
      }).addTo(map);
    });
    return () => {
      cancelled = true;
      layer?.remove();
    };
  }, [map, quakes, dark]);

  return null;
}
