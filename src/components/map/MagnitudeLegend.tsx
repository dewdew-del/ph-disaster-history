"use client";

import { MAG_BANDS, magColor, magRadius } from "@/lib/scales";

export default function MagnitudeLegend({ dark }: { dark: boolean }) {
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-md bg-surface px-3.5 py-2 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
      <span className="font-semibold">M</span>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {MAG_BANDS.map((b) => {
          const r = magRadius(b.min + 0.2);
          return (
            <li key={b.label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block rounded-full border border-black/40"
                style={{ width: r * 2, height: r * 2, background: magColor(b.min, dark) }}
              />
              <span className="tabular-nums text-muted">{b.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
