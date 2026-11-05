"use client";

import { categoryName } from "@/lib/scales";
import type { ProvinceInfo } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";
import { ALL_CATS, type StormFilter } from "./stormFilter";

type Props = {
  filter: StormFilter;
  onChange: (f: StormFilter) => void;
  decades: number[];
  provinces?: ProvinceInfo[];
};

const selectCls = "h-11 w-full rounded-lg border border-control bg-background px-3 text-base";

export default function StormFilters({ filter, onChange, decades, provinces }: Props) {
  const searching = filter.q.trim() !== "";
  const years = filter.decade === "all" ? [] : Array.from({ length: 10 }, (_, i) => (filter.decade as number) + i);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm text-muted">Search name</span>
        <input
          type="search"
          value={filter.q}
          onChange={(e) => onChange({ ...filter, q: e.target.value })}
          placeholder="Yolanda, Haiyan, Ondoy, 2013…"
          className={`mt-1 ${selectCls}`}
        />
        {searching && <span className="mt-1 block text-xs text-muted">Searching all years.</span>}
      </label>

      <div className={`grid grid-cols-2 gap-2 ${searching ? "opacity-50" : ""}`}>
        <label className="block">
          <span className="text-sm text-muted">Decade</span>
          <select
            className={`mt-1 ${selectCls}`}
            value={String(filter.decade)}
            disabled={searching}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...filter, decade: v === "all" ? "all" : Number(v), year: "all" });
            }}
          >
            <option value="all">All years</option>
            {[...decades].reverse().map((d) => (
              <option key={d} value={d}>
                {d}s
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-muted">Year</span>
          <select
            className={`mt-1 ${selectCls}`}
            value={String(filter.year)}
            disabled={searching || filter.decade === "all"}
            onChange={(e) => onChange({ ...filter, year: e.target.value === "all" ? "all" : Number(e.target.value) })}
          >
            <option value="all">All</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      {provinces && provinces.length > 0 && (
        <label className="block">
          <span className="text-sm text-muted">Province hit (approximate path area)</span>
          <select
            className={`mt-1 ${selectCls}`}
            value={filter.province}
            onChange={(e) => onChange({ ...filter, province: e.target.value, decade: e.target.value ? "all" : filter.decade, year: "all" })}
          >
            <option value="">Any province</option>
            {provinces.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Peak strength</legend>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATS.map((c) => {
            const on = filter.cats.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                title={categoryName(c)}
                onClick={() =>
                  onChange({ ...filter, cats: on ? filter.cats.filter((x) => x !== c) : [...filter.cats, c] })
                }
                className={`rounded-full ${on ? "" : "opacity-40"}`}
              >
                <CategoryBadge cat={c} />
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
