"use client";

import { CATEGORIES, UNKNOWN_COLOR, rampColor } from "@/lib/scales";

type Props = { dark: boolean; showUnknown?: boolean; showPar?: boolean };

export default function CategoryLegend({ dark, showUnknown = true, showPar = true }: Props) {
  return (
    <div className="pointer-events-auto rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium">Strength (PAGASA scale)</div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {CATEGORIES.map((c, i) => (
          <li key={c.code} className="flex items-center gap-1.5" title={c.name}>
            <span aria-hidden className="inline-block h-1 w-4 rounded" style={{ background: rampColor(i, dark) }} />
            <span className="text-muted">{c.code}</span>
          </li>
        ))}
        {showUnknown && (
          <li className="flex items-center gap-1.5" title="No wind data">
            <span aria-hidden className="inline-block h-1 w-4 rounded" style={{ background: UNKNOWN_COLOR }} />
            <span className="text-muted">Unknown</span>
          </li>
        )}
        {showPar && (
          <li className="flex items-center gap-1.5" title="Philippine Area of Responsibility">
            <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-accent" />
            <span className="text-muted">PAR</span>
          </li>
        )}
      </ul>
    </div>
  );
}
