"use client";

// Loaded with next/dynamic { ssr: false } (Leaflet needs `window`).
import BaseMap from "@/components/map/BaseMap";
import ParOutline from "@/components/map/ParOutline";
import TrackLayer, { type TrackInput } from "./TrackLayer";

type Props = {
  tracks: TrackInput[];
  dark: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const WIDE_BOUNDS: [[number, number], [number, number]] = [
  [3, 112],
  [27, 138],
];

export default function BagyoMap({ tracks, dark, selectedId, onSelect }: Props) {
  return (
    <BaseMap bounds={WIDE_BOUNDS}>
      <ParOutline dark={dark} />
      <TrackLayer tracks={tracks} dark={dark} selectedId={selectedId} onSelect={onSelect} fitSelected />
    </BaseMap>
  );
}
