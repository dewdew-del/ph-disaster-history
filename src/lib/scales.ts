import type { CatCode } from "./types";

// Color and size scales shared by maps, legends and charts.
// Two ordinal ramps for "intensity": earthquakes burn warm (amber to red), typhoons run cool (sky blue to deep blue / white).
// Light mode: weak = lighter, strong = darker. Dark mode flips so strong stands out most.
export type RampKind = "quake" | "storm";

const RAMPS: Record<RampKind, { light: string[]; dark: string[] }> = {
  quake: {
    light: ["#e9a800", "#ec8a00", "#e8590c", "#d9381e", "#a61e1e"],
    dark: ["#b0581c", "#e8590c", "#ff8a3d", "#ffc14d", "#ffe08a"],
  },
  storm: {
    light: ["#7cc0ee", "#3f9be6", "#1f7fd6", "#145fb0", "#0b3d7a"],
    dark: ["#2a6aa8", "#3a92e0", "#62bdf6", "#a6dcff", "#eaf7ff"],
  },
};

export const UNKNOWN_COLOR = "#94a3b8";

export function rampColor(step: number, dark: boolean, kind: RampKind = "quake"): string {
  const ramp = dark ? RAMPS[kind].dark : RAMPS[kind].light;
  return ramp[Math.max(0, Math.min(ramp.length - 1, step))];
}

// ---------- Earthquakes ----------

export const MAG_BANDS = [
  { label: "4.5–4.9", min: 4.5 },
  { label: "5.0–5.9", min: 5 },
  { label: "6.0–6.9", min: 6 },
  { label: "7.0–7.9", min: 7 },
  { label: "8.0+", min: 8 },
];

export function magStep(mag: number): number {
  if (mag >= 8) return 4;
  if (mag >= 7) return 3;
  if (mag >= 6) return 2;
  if (mag >= 5) return 1;
  return 0;
}

export const magColor = (mag: number, dark: boolean) => rampColor(magStep(mag), dark);

/** Marker radius in px: grows fast with magnitude so big quakes stand out. */
export function magRadius(mag: number): number {
  return Math.round((1.6 * 1.75 ** (mag - 4.5) + 1) * 10) / 10;
}

export const DEPTH_BANDS = [
  { key: "shallow", label: "Shallow", range: "0–70 km", min: -Infinity, max: 70 },
  { key: "intermediate", label: "Intermediate", range: "70–300 km", min: 70, max: 300 },
  { key: "deep", label: "Deep", range: "300+ km", min: 300, max: Infinity },
] as const;

export type DepthKey = (typeof DEPTH_BANDS)[number]["key"];

export function depthKey(depth: number): DepthKey {
  if (depth < 70) return "shallow";
  if (depth < 300) return "intermediate";
  return "deep";
}

// ---------- Typhoons (PAGASA scale, 10-min wind in km/h) ----------

export const CATEGORIES = [
  { code: "TD", name: "Tropical Depression", min: 0 },
  { code: "TS", name: "Tropical Storm", min: 62 },
  { code: "STS", name: "Severe Tropical Storm", min: 89 },
  { code: "TY", name: "Typhoon", min: 118 },
  { code: "STY", name: "Super Typhoon", min: 185 },
] as const;

export type CategoryCode = CatCode;

export function categoryIndex(code: CategoryCode): number {
  return CATEGORIES.findIndex((c) => c.code === code);
}

/** PAGASA category index from 10-min wind in km/h: 0 = TD … 4 = STY, -1 = unknown. */
export function catIndexFromKmh(kmh: number | null): number {
  if (kmh === null) return -1;
  for (let i = CATEGORIES.length - 1; i >= 0; i--) if (kmh >= CATEGORIES[i].min) return i;
  return 0;
}

export function catCodeFromIndex(i: number): CatCode {
  return i < 0 ? "UNK" : CATEGORIES[i].code;
}

export const catColorByIndex = (i: number, dark: boolean) => (i < 0 ? UNKNOWN_COLOR : rampColor(i, dark, "storm"));

export function categoryColor(code: CategoryCode, dark: boolean): string {
  const i = categoryIndex(code);
  return i < 0 ? UNKNOWN_COLOR : rampColor(i, dark, "storm");
}

export function categoryName(code: CategoryCode): string {
  return CATEGORIES.find((c) => c.code === code)?.name ?? "Unknown strength";
}
