"use client";

import dynamic from "next/dynamic";
import type { Feature } from "geojson";
import MagnitudeLegend from "@/components/map/MagnitudeLegend";
import MapLoading from "@/components/map/MapLoading";
import type { QuakeRow } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";

const ProvinceMap = dynamic(() => import("./ProvinceMap"), { ssr: false, loading: () => <MapLoading /> });

type Props = { feature: Feature; bbox: [number, number, number, number]; rows: QuakeRow[]; name: string };

export default function ProvinceMapView({ feature, bbox, rows, name }: Props) {
  const dark = useIsDark();
  return (
    <div className="relative h-[380px] overflow-hidden rounded-xl border border-border sm:h-[460px]">
      <ProvinceMap
        feature={feature}
        bbox={bbox}
        rows={rows}
        dark={dark}
        landLabel={name}
        offshoreLabel={`Offshore, near ${name}`}
      />
      <div className="pointer-events-none absolute bottom-6 left-2 z-[1000] max-w-[calc(100%-1rem)]">
        <MagnitudeLegend dark={dark} />
      </div>
    </div>
  );
}
