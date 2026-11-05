import { getQuakes, readPublicJson } from "@/lib/data-server";

// A static picture of where strong quakes hit, drawn at build time (no Leaflet, no 1 MB download on the home page).
// Each magnitude band is one SVG path of zero-length round-capped segments, so ~5,000 dots stay small.

const LON0 = 116;
const LON1 = 128;
const LAT0 = 4;
const LAT1 = 21.5;
const K = Math.cos((((LAT0 + LAT1) / 2) * Math.PI) / 180);
const W = 600;
const S = W / ((LON1 - LON0) * K);
const H = Math.round((LAT1 - LAT0) * S);

const x = (lon: number) => Math.round((lon - LON0) * K * S);
const y = (lat: number) => Math.round((LAT1 - lat) * S);

type Geometry = { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };

const BANDS = [
  { min: 5, max: 6, width: 3.2, color: "var(--cat-0)", opacity: 0.45 },
  { min: 6, max: 7, width: 6.5, color: "var(--cat-2)", opacity: 0.8 },
  { min: 7, max: 99, width: 11, color: "var(--cat-3)", opacity: 0.9 },
];

export const MIN_MAG = BANDS[0].min;

export default function QuakeDotsMap({ className = "" }: { className?: string }) {
  const outline = readPublicJson<{ geometries: Geometry[] }>("data/ph-outline.json");
  const land = outline.geometries
    .flatMap((g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates))
    .flatMap((poly) => poly)
    .map((ring) => "M" + ring.map(([lon, lat]) => `${x(lon)} ${y(lat)}`).join("L") + "Z")
    .join("");

  const rows = getQuakes().rows;
  const paths = BANDS.map((b) =>
    rows
      .filter((r) => r[2] >= b.min && r[2] < b.max)
      .map((r) => `M${x(r[5])} ${y(r[4])}h0`)
      .join(""),
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Map of the Philippines with every M${MIN_MAG}+ earthquake since 1900`}>
      <path d={land} fill="var(--raised)" />
      {BANDS.map((b, i) => (
        <path key={b.min} d={paths[i]} fill="none" stroke={b.color} strokeOpacity={b.opacity} strokeWidth={b.width} strokeLinecap="round" />
      ))}
    </svg>
  );
}
