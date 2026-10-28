"use client";

import { formatDatePH, formatMag } from "@/lib/format";
import { magColor } from "@/lib/scales";
import type { Quake } from "@/lib/types";

type Props = {
  quakes: Quake[];
  dark: boolean;
  label: (q: Quake) => string | undefined;
  onPick: (q: Quake) => void;
};

/** Top 20 strongest quakes in the current filter; click one to fly to it. */
export default function StrongestList({ quakes, dark, label, onPick }: Props) {
  const top = [...quakes].sort((a, b) => b.mag - a.mag || a.time - b.time).slice(0, 20);
  if (top.length === 0) return <p className="text-sm text-muted">No quakes match the filters.</p>;
  return (
    <ol className="divide-y divide-border">
      {top.map((q, i) => (
        <li key={q.id}>
          <button
            type="button"
            onClick={() => onPick(q)}
            className="flex w-full items-start gap-3 px-1 py-2 text-left hover:bg-foreground/5"
          >
            <span className="w-5 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted">{i + 1}</span>
            <span
              aria-hidden
              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full border border-black/40"
              style={{ background: magColor(q.mag, dark) }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {formatMag(q.mag)} <span className="font-normal text-muted">· {formatDatePH(q.time)}</span>
              </span>
              <span className="block truncate text-xs text-muted">{label(q) ?? q.place}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
