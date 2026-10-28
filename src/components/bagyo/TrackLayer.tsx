"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { escapeHtml } from "@/lib/format";
import { catColorByIndex } from "@/lib/scales";

export type TrackInput = { id: string; label: string; points: [number, number, number][] };

type Props = {
  tracks: TrackInput[];
  dark: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Fit the map to the selected track when it changes (e.g. picked from the list). */
  fitSelected?: boolean;
  /** Fit the map to all tracks once they load (single-storm pages). */
  fitAll?: boolean;
  /** Line width for unselected tracks */
  weight?: number;
  /** Show a popup with a link to the storm page when a track is clicked */
  linkPopups?: boolean;
};

/** Splits a track into same-color runs so each run is one polyline. */
function colorRuns(points: [number, number, number][], dark: boolean) {
  const runs: { color: string; latlngs: L.LatLngTuple[] }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const color = catColorByIndex(Math.max(a[2], b[2]), dark);
    const last = runs[runs.length - 1];
    if (last && last.color === color) last.latlngs.push([b[0], b[1]]);
    else runs.push({ color, latlngs: [[a[0], a[1]], [b[0], b[1]]] });
  }
  if (points.length === 1) runs.push({ color: catColorByIndex(points[0][2], dark), latlngs: [[points[0][0], points[0][1]]] });
  return runs;
}

export default function TrackLayer({
  tracks,
  dark,
  selectedId,
  onSelect,
  fitSelected = false,
  fitAll = false,
  weight = 2,
  linkPopups = true,
}: Props) {
  const map = useMap();
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // All tracks.
  useEffect(() => {
    const renderer = L.canvas({ padding: 0.3, tolerance: 6 });
    const group = L.layerGroup();
    for (const t of tracks) {
      const popup = linkPopups
        ? `<div style="min-width:160px"><div style="font-weight:600">${escapeHtml(t.label)}</div><a href="/bagyo/${encodeURIComponent(t.id)}">Open storm page →</a></div>`
        : null;
      for (const run of colorRuns(t.points, dark)) {
        const line =
          run.latlngs.length === 1
            ? L.circleMarker(run.latlngs[0], { renderer, radius: 3, color: run.color, fillOpacity: 1, weight: 1 })
            : L.polyline(run.latlngs, { renderer, color: run.color, weight, opacity: 0.85, lineCap: "round", lineJoin: "round" });
        line.on("click", () => onSelectRef.current?.(t.id));
        if (popup) line.bindPopup(popup);
        group.addLayer(line);
      }
    }
    group.addTo(map);
    if (fitAll && tracks.length) {
      const bounds = L.latLngBounds(tracks.flatMap((t) => t.points.map((p) => [p[0], p[1]] as L.LatLngTuple)));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 7 });
    }
    return () => {
      group.remove();
    };
  }, [map, tracks, dark, weight, linkPopups, fitAll]);

  // Selected track drawn on top, thicker, with a casing so it stands out.
  useEffect(() => {
    if (!selectedId) return;
    const t = tracks.find((x) => x.id === selectedId);
    if (!t) return;
    const renderer = L.canvas({ padding: 0.3 });
    const group = L.layerGroup();
    const latlngs = t.points.map((p) => [p[0], p[1]] as L.LatLngTuple);
    group.addLayer(L.polyline(latlngs, { renderer, color: dark ? "#0b1220" : "#ffffff", weight: 8, opacity: 0.9, interactive: false }));
    for (const run of colorRuns(t.points, dark)) {
      if (run.latlngs.length > 1) {
        group.addLayer(L.polyline(run.latlngs, { renderer, color: run.color, weight: 4.5, opacity: 1, interactive: false }));
      }
    }
    group.addTo(map);
    if (fitSelected && latlngs.length) map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30], maxZoom: 6 });
    return () => {
      group.remove();
    };
  }, [map, tracks, selectedId, dark, fitSelected]);

  return null;
}
