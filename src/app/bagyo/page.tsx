import type { Metadata } from "next";
import BagyoExplorer from "@/components/bagyo/BagyoExplorer";

export const metadata: Metadata = {
  title: "Bagyo · Typhoons",
  description:
    "Every typhoon and tropical storm that entered the Philippine Area of Responsibility since 1945: local names, tracks, strength and damage.",
};

export default function BagyoPage() {
  return <BagyoExplorer />;
}
