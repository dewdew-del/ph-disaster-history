"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateRangePH, formatNumber } from "@/lib/format";
import { stormLabel, type TyphoonSummary } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";

type Props = {
  storms: TyphoonSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const PAGE = 60;

export function deathsText(s: Pick<TyphoonSummary, "deaths" | "phDeaths">): string | null {
  if (s.phDeaths !== null) return `${formatNumber(s.phDeaths)} dead in PH`;
  if (s.deaths !== null) return `${formatNumber(s.deaths)} dead (all areas)`;
  return null;
}

export default function StormList({ storms, selectedId, onSelect }: Props) {
  const [shown, setShown] = useState(PAGE);
  if (storms.length === 0) return <p className="py-4 text-sm text-muted">No storms match the filters.</p>;
  const visible = storms.slice(0, shown);

  return (
    <div>
      <ul className="divide-y divide-border">
        {visible.map((s) => {
          const deaths = deathsText(s);
          const selected = s.id === selectedId;
          return (
            <li key={s.id} className={selected ? "bg-accent/10" : ""}>
              <div className="flex items-start gap-2 px-1 py-2">
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="min-w-0 flex-1 text-left"
                  aria-pressed={selected}
                  title="Show on map"
                >
                  <span className="flex items-center gap-2">
                    <CategoryBadge cat={s.cat} est={s.est} />
                    <span className="truncate font-medium">{stormLabel(s)}</span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">{s.season}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {formatDateRangePH(s.start, s.end)}
                    {s.kmh !== null && ` · ${s.kmh} km/h${s.est ? " (est.)" : ""}`}
                    {deaths && ` · ${deaths}`}
                    {s.provisional && " · provisional"}
                  </span>
                </button>
                <Link
                  href={`/bagyo/${s.id}`}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10"
                >
                  Details →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {shown < storms.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-2 w-full rounded-md border border-border py-2 text-sm hover:bg-foreground/5"
        >
          Show more ({formatNumber(storms.length - shown)} left)
        </button>
      )}
    </div>
  );
}
