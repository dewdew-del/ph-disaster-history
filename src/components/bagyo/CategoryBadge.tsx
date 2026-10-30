"use client";

import { categoryColor, categoryName } from "@/lib/scales";
import type { CatCode } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";

/** Category chip: colored dot (identity) + code in normal text color, full name on hover. */
export default function CategoryBadge({ cat, est }: { cat: CatCode; est?: boolean }) {
  const dark = useIsDark();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-sm font-medium"
      title={`${categoryName(cat)}${est ? " (wind estimated from JTWC)" : ""}`}
    >
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: categoryColor(cat, dark) }} />
      {cat === "UNK" ? "?" : cat}
    </span>
  );
}
