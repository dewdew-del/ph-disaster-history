"use client";

// Loaded with next/dynamic { ssr: false } from StormMapView (Leaflet needs `window`).
import { useMemo } from "react";
import { CircleMarker, GeoJSON, Tooltip } from "react-leaflet";
import type { FeatureCollection } from "geojson";
import BaseMap from "@/components/map/BaseMap";
import ParOutline from "@/components/map/ParOutline";
import { formatDateTimePH } from "@/lib/format";
import type { TrackPoint } from "@/lib/types";
import TrackLayer, { type TrackInput } from "./TrackLayer";

type Props = {
  id: string;
  label: string;
  track: TrackPoint[];
  dark: boolean;
  /** Affected provinces (approximate path area), drawn as a highlight under the track */
  provinces?: FeatureCollection | null;
};

export default function StormMap({ id, label, track, dark, provinces }: Props) {
  const tracks: TrackInput[] = useMemo(
    () => [{ id, label, points: track.map((p) => [p[1], p[2], p[5]] as [number, number, number]) }],
    [id, label, track],
  );
  const first = track[0];
  const last = track[track.length - 1];
  const highlight = dark ? "#5eead4" : "#0f766e";

  return (
    <BaseMap bounds={[[3, 112], [27, 138]]}>
      <ParOutline dark={dark} />
      {provinces && provinces.features.length > 0 && (
        <GeoJSON
          key={`${id}-${dark}`}
          data={provinces}
          style={{ color: highlight, weight: 1, fillColor: highlight, fillOpacity: dark ? 0.25 : 0.2 }}
          onEachFeature={(f, layer) => layer.bindTooltip(String(f.properties?.name ?? ""), { sticky: true })}
        />
      )}
      <TrackLayer tracks={tracks} dark={dark} selectedId={id} fitAll weight={3} linkPopups={false} />
      {first && (
        <CircleMarker center={[first[1], first[2]]} radius={5} pathOptions={{ color: highlight, fillOpacity: 1 }}>
          <Tooltip>Start: {formatDateTimePH(first[0])}</Tooltip>
        </CircleMarker>
      )}
      {last && (
        <CircleMarker center={[last[1], last[2]]} radius={5} pathOptions={{ color: highlight, fillColor: "#ffffff", fillOpacity: 1 }}>
          <Tooltip>End: {formatDateTimePH(last[0])}</Tooltip>
        </CircleMarker>
      )}
    </BaseMap>
  );
}
