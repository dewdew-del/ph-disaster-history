"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import CategoryLegend from "@/components/map/CategoryLegend";
import MapLoading from "@/components/map/MapLoading";
import { loadJson } from "@/lib/data-client";
import type { TrackPoint } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";

const StormMap = dynamic(() => import("./StormMap"), { ssr: false, loading: () => <MapLoading /> });

type Props = { id: string; label: string; track: TrackPoint[]; provinceSlugs: string[] };

export default function StormMapView({ id, label, track, provinceSlugs }: Props) {
  const dark = useIsDark();
  const [provinces, setProvinces] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (provinceSlugs.length === 0) return;
    const wanted = new Set(provinceSlugs);
    loadJson<FeatureCollection>("/data/provinces.json")
      .then((fc) => setProvinces({ ...fc, features: fc.features.filter((f) => wanted.has(String(f.properties?.slug))) }))
      .catch(() => setProvinces(null));
  }, [provinceSlugs]);

  return (
    <div className="relative h-[340px] overflow-hidden rounded-2xl bg-surface sm:h-[440px]">
      <StormMap id={id} label={label} track={track} dark={dark} provinces={provinces} />
      <div className="pointer-events-none absolute bottom-6 left-2 z-[1000] max-w-[calc(100%-1rem)]">
        <CategoryLegend dark={dark} showUnknown={track.some((p) => p[5] < 0)} />
      </div>
    </div>
  );
}
