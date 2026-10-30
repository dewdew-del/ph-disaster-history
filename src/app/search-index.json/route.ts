import { getProvinceIndex, getTyphoonIndex } from "@/lib/data-server";

// Small index for the header search, written to /search-index.json at build time.
// Storm row: [id, local name, international name, season, category]; province row: [slug, name, region].
export const dynamic = "force-static";

export function GET() {
  const storms = getTyphoonIndex().storms.map((s) => [s.id, s.local, s.name, s.season, s.cat]);
  const provinces = getProvinceIndex().map((p) => [p.slug, p.name, p.region]);
  return Response.json({ storms, provinces });
}
