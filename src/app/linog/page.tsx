import type { Metadata } from "next";
import LinogExplorer from "@/components/linog/LinogExplorer";

export const metadata: Metadata = {
  title: "Linog · Earthquakes",
  description: "Map of earthquakes M4.5+ in and around the Philippines since 1900, from the USGS catalog.",
};

export default function LinogPage() {
  return <LinogExplorer />;
}
