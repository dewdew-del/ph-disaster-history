import type { Metadata } from "next";
import LugarPicker from "@/components/lugar/LugarPicker";
import { getProvinceIndex } from "@/lib/data-server";
import { provinceCounts } from "@/lib/province-stats";

export const metadata: Metadata = {
  title: "My Province",
  description: "Pick a Philippine province to see its earthquake and typhoon history.",
};

export default function LugarPage() {
  return <LugarPicker provinces={getProvinceIndex()} counts={provinceCounts()} />;
}
