"use client";

// Only import this file through next/dynamic with { ssr: false }: Leaflet needs `window`.
import type { ReactNode } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";

export const PH_BOUNDS: LatLngBoundsExpression = [
  [4.4, 116.5],
  [21.2, 126.8],
];

type Props = {
  children?: ReactNode;
  bounds?: LatLngBoundsExpression;
  className?: string;
  scrollWheelZoom?: boolean;
};

export default function BaseMap({ children, bounds = PH_BOUNDS, className = "h-full w-full", scrollWheelZoom = true }: Props) {
  return (
    <MapContainer
      bounds={bounds}
      preferCanvas
      scrollWheelZoom={scrollWheelZoom}
      minZoom={4}
      worldCopyJump={false}
      className={className}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={18}
      />
      {children}
    </MapContainer>
  );
}
