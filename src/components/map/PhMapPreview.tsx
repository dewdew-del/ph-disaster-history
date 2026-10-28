"use client";

import dynamic from "next/dynamic";
import MapLoading from "./MapLoading";

const BaseMap = dynamic(() => import("./BaseMap"), { ssr: false, loading: () => <MapLoading /> });

export default function PhMapPreview() {
  return <BaseMap scrollWheelZoom={false} />;
}
