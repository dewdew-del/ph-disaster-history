"use client";

import { Polygon } from "react-leaflet";

// Philippine Area of Responsibility, [lat, lon]. Drawn as a dashed outline; the legend explains it.
const PAR: [number, number][] = [
  [5, 115],
  [15, 115],
  [21, 120],
  [25, 120],
  [25, 135],
  [5, 135],
];

export default function ParOutline({ dark }: { dark: boolean }) {
  return (
    <Polygon
      positions={PAR}
      interactive={false}
      pathOptions={{ color: dark ? "#f1f2f4" : "#15171a", weight: 1.2, dashArray: "6 5", fill: false, opacity: 0.8 }}
    />
  );
}
