"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import MapLoading from "@/components/map/MapLoading";
import MagnitudeLegend from "@/components/map/MagnitudeLegend";
import BottomSheet from "@/components/ui/BottomSheet";
import { loadQuakes } from "@/lib/data-client";
import { fastYearPH, formatNumber } from "@/lib/format";
import { toQuake, type QuakesFile } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";
import { applyFilter, defaultFilter, type QuakeFilter, type QuakeWithYear } from "./filters";
import QuakeFilters from "./QuakeFilters";

const LinogMap = dynamic(() => import("./LinogMap"), { ssr: false, loading: () => <MapLoading /> });

const FIRST_YEAR = 1900;
const THIS_YEAR = new Date().getFullYear();

export default function LinogExplorer() {
  const [data, setData] = useState<QuakesFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuakeFilter>(() => defaultFilter(FIRST_YEAR, THIS_YEAR));
  const [sheetOpen, setSheetOpen] = useState(false);
  const dark = useIsDark();

  useEffect(() => {
    loadQuakes()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const quakes: QuakeWithYear[] = useMemo(
    () => (data ? data.rows.map((r) => ({ ...toQuake(r), year: fastYearPH(r[1]) })) : []),
    [data],
  );

  // Dragging a slider stays smooth: the map redraws with the deferred value.
  const deferredFilter = useDeferredValue(filter);
  const filtered = useMemo(() => applyFilter(quakes, deferredFilter), [quakes, deferredFilter]);

  const filters = (
    <QuakeFilters
      filter={filter}
      onChange={setFilter}
      onReset={() => setFilter(defaultFilter(FIRST_YEAR, THIS_YEAR))}
      firstYear={FIRST_YEAR}
      lastYear={THIS_YEAR}
    />
  );

  return (
    <div className="lg:flex lg:h-[calc(100dvh-3.5rem)]">
      <aside className="border-border px-4 py-4 lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r">
        <h1 className="text-2xl font-bold tracking-tight">Linog Map</h1>
        <p className="mt-1 text-sm text-muted">
          Earthquakes M4.5+ in and around the Philippines since 1900, from the USGS catalog.
        </p>
        <p className="mt-3 text-sm" aria-live="polite">
          {data ? (
            <>
              Showing <strong className="tabular-nums">{formatNumber(filtered.length)}</strong> of{" "}
              <span className="tabular-nums">{formatNumber(quakes.length)}</span> quakes
            </>
          ) : error ? (
            <span className="text-red-600">Could not load quake data: {error}</span>
          ) : (
            "Loading quakes…"
          )}
        </p>
        <div className="mt-5 hidden lg:block">{filters}</div>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          Before 1973 the catalog mostly lists bigger quakes, so older years look quieter than they were. USGS
          magnitudes can differ slightly from PHIVOLCS.
        </p>
      </aside>

      <section className="relative h-[62dvh] min-h-[360px] lg:h-auto lg:flex-1" aria-label="Earthquake map">
        <LinogMap quakes={filtered} dark={dark} />
        <div className="pointer-events-none absolute bottom-6 left-2 z-[1000] max-w-[calc(100%-1rem)]">
          <MagnitudeLegend dark={dark} />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="absolute right-2 top-2 z-[1000] rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow lg:hidden"
        >
          Filters
        </button>
      </section>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter quakes">
        {filters}
      </BottomSheet>
    </div>
  );
}
