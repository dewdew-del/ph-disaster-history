"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { escapeHtml, formatDateTimePH, formatMag } from "@/lib/format";
import { magColor, magRadius } from "@/lib/scales";
import type { Quake } from "@/lib/types";

export function quakePopupHtml(q: Quake, provinceLabel?: string): string {
  const where = provinceLabel ? `<div style="opacity:.8">${escapeHtml(provinceLabel)}</div>` : "";
  return `<div style="min-width:180px">
    <div style="font-weight:600;font-size:15px">${formatMag(q.mag)} earthquake</div>
    <div>${escapeHtml(formatDateTimePH(q.time))}</div>
    <div>Depth: ${q.depth.toFixed(0)} km</div>
    <div>${escapeHtml(q.place || "Unknown location")}</div>
    ${where}
    <a href="https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(q.id)}" target="_blank" rel="noopener noreferrer">USGS event page ↗</a>
  </div>`;
}

type Props = {
  quakes: Quake[];
  dark: boolean;
  provinceLabel?: (q: Quake) => string | undefined;
  /** When set, the map flies to this quake and opens its popup. `n` changes on every click. */
  focus?: { id: string; n: number } | null;
};

const markerStyle = (q: Quake, dark: boolean): L.CircleMarkerOptions => ({
  radius: magRadius(q.mag),
  color: dark ? "#0b1220" : "#431407",
  weight: 0.6,
  opacity: 0.7,
  fillColor: magColor(q.mag, dark),
  fillOpacity: 0.85,
});

/**
 * Draws quakes as canvas circle markers. Markers are created once and cached;
 * a filter change only adds/removes the markers that changed, so sliders stay smooth.
 */
export default function QuakeLayer({ quakes, dark, provinceLabel, focus }: Props) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());
  const shownRef = useRef(new Set<string>());
  const darkRef = useRef(dark);
  const labelRef = useRef(provinceLabel);
  useEffect(() => {
    labelRef.current = provinceLabel;
  }, [provinceLabel]);

  // Create the layer group once per map.
  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    rendererRef.current = L.canvas({ padding: 0.3 });
    groupRef.current = group;
    const markers = markersRef.current;
    const shown = shownRef.current;
    return () => {
      group.remove();
      markers.clear();
      shown.clear();
      groupRef.current = null;
    };
  }, [map]);

  // Sync the shown markers with the filtered quake list.
  useEffect(() => {
    const group = groupRef.current;
    const renderer = rendererRef.current;
    if (!group || !renderer) return;
    const next = new Set(quakes.map((q) => q.id));
    for (const id of shownRef.current) {
      if (!next.has(id)) {
        const m = markersRef.current.get(id);
        if (m) group.removeLayer(m);
      }
    }
    const added: [Quake, L.CircleMarker][] = [];
    for (const q of quakes) {
      if (shownRef.current.has(q.id)) continue;
      let m = markersRef.current.get(q.id);
      if (!m) {
        m = L.circleMarker([q.lat, q.lon], { renderer, ...markerStyle(q, darkRef.current) });
        m.bindPopup(() => quakePopupHtml(q, labelRef.current?.(q)));
        markersRef.current.set(q.id, m);
      }
      added.push([q, m]);
    }
    // Add small quakes first so big ones end up drawn on top.
    added.sort((a, b) => a[0].mag - b[0].mag);
    for (const [, m] of added) group.addLayer(m);
    if (added.length > 0) {
      for (const q of quakes) if (q.mag >= 6.5) markersRef.current.get(q.id)?.bringToFront();
    }
    shownRef.current = next;
  }, [quakes]);

  // Theme change: restyle cached markers instead of recreating them.
  useEffect(() => {
    if (darkRef.current === dark) return;
    darkRef.current = dark;
    for (const q of quakes) markersRef.current.get(q.id)?.setStyle(markerStyle(q, dark));
    // Markers not shown right now get restyled lazily by dropping them from the cache.
    for (const id of [...markersRef.current.keys()]) if (!shownRef.current.has(id)) markersRef.current.delete(id);
  }, [dark, quakes]);

  useEffect(() => {
    if (!focus) return;
    const marker = markersRef.current.get(focus.id);
    if (!marker) return;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 7), { duration: 0.8 });
    map.once("moveend", () => marker.openPopup());
  }, [focus, map]);

  return null;
}
