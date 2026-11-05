"use client";

import RangePair from "@/components/ui/RangePair";
import { DEPTH_BANDS } from "@/lib/scales";
import { MAG_LIMITS, type QuakeFilter } from "./filters";

type Props = {
  filter: QuakeFilter;
  onChange: (f: QuakeFilter) => void;
  firstYear: number;
  lastYear: number;
};

export default function QuakeFilters({ filter, onChange, firstYear, lastYear }: Props) {
  return (
    <div className="space-y-5">
      <RangePair
        label="Magnitude"
        min={MAG_LIMITS.min}
        max={MAG_LIMITS.max}
        step={0.1}
        from={filter.magMin}
        to={filter.magMax}
        format={(n) => `M${n.toFixed(1)}`}
        onChange={(magMin, magMax) => onChange({ ...filter, magMin: round1(magMin), magMax: round1(magMax) })}
      />
      <RangePair
        label="Years"
        min={firstYear}
        max={lastYear}
        step={1}
        from={filter.yearFrom}
        to={filter.yearTo}
        onChange={(yearFrom, yearTo) => onChange({ ...filter, yearFrom, yearTo })}
      />
      <fieldset>
        <legend className="mb-2 text-sm text-muted">Depth</legend>
        <div className="flex flex-wrap gap-2">
          {DEPTH_BANDS.map((d) => (
            <label
              key={d.key}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-control px-3 py-2 text-sm has-[:checked]:border-foreground"
            >
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={filter.depths[d.key]}
                onChange={(e) => onChange({ ...filter, depths: { ...filter.depths, [d.key]: e.target.checked } })}
              />
              {d.label} <span className="text-muted">({d.range})</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;
