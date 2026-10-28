"use client";

import dynamic from "next/dynamic";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import MapLoading from "@/components/map/MapLoading";
import MagnitudeLegend from "@/components/map/MagnitudeLegend";
import BottomSheet from "@/components/ui/BottomSheet";
import { loadQuakes } from "@/lib/data-client";
import { fastYearPH, formatNumber } from "@/lib/format";
import { WHERE_LAND, WHERE_OFFSHORE, toQuake, type Quake, type QuakesFile } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";
import { applyFilter, defaultFilter, type QuakeFilter, type QuakeWithYear } from "./filters";
import type { MapMode } from "./LinogMap";
import QuakeFilters from "./QuakeFilters";
import StrongestList from "./StrongestList";

const LinogMap = dynamic(() => import("./LinogMap"), { ssr: false, loading: () => <MapLoading /> });
const QuakeCharts = dynamic(() => import("./QuakeCharts"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">Loading charts…</p>,
});

const FIRST_YEAR = 1900;
const THIS_YEAR = new Date().getFullYear();

type Tab = "charts" | "strongest";

export default function LinogExplorer() {
  const [data, setData] = useState<QuakesFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuakeFilter>(() => defaultFilter(FIRST_YEAR, THIS_YEAR));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<MapMode>("dots");
  const [tab, setTab] = useState<Tab>("charts");
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const mapRef = useRef<HTMLElement>(null);
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

  const provinceNames = useMemo(() => data?.provinceNames ?? [], [data]);

  const provinceLabel = useCallback(
    (q: Quake) => {
      const name = q.prov >= 0 ? provinceNames[q.prov] : undefined;
      if (q.where === WHERE_LAND && name) return name;
      if (q.where === WHERE_OFFSHORE && name) return `Offshore, near ${name}`;
      return "Outside PH";
    },
    [provinceNames],
  );

  // Dragging a slider stays smooth: the map and charts update with the deferred value.
  const deferredFilter = useDeferredValue(filter);
  const filtered = useMemo(() => applyFilter(quakes, deferredFilter), [quakes, deferredFilter]);

  function pickQuake(q: Quake) {
    setMode("dots");
    setFocus((f) => ({ id: q.id, n: (f?.n ?? 0) + 1 }));
    if (window.innerWidth < 1024) mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filters = (
    <QuakeFilters
      filter={filter}
      onChange={setFilter}
      onReset={() => setFilter(defaultFilter(FIRST_YEAR, THIS_YEAR))}
      firstYear={FIRST_YEAR}
      lastYear={THIS_YEAR}
    />
  );

  const countLine = data ? (
    <>
      Showing <strong className="tabular-nums">{formatNumber(filtered.length)}</strong> of{" "}
      <span className="tabular-nums">{formatNumber(quakes.length)}</span> quakes
    </>
  ) : error ? (
    <span className="text-red-600">Could not load quake data: {error}</span>
  ) : (
    "Loading quakes…"
  );

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-row">
      <div className="px-4 pb-3 pt-4 lg:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Linog Map</h1>
        <p className="mt-1 text-sm text-muted">Earthquakes M4.5+ in and around the Philippines since 1900 (USGS).</p>
        <p className="mt-2 text-sm" aria-live="polite">
          {countLine}
        </p>
      </div>

      <section
        ref={mapRef}
        className="relative h-[62dvh] min-h-[360px] scroll-mt-14 lg:order-2 lg:h-auto lg:flex-1"
        aria-label="Earthquake map"
      >
        <LinogMap quakes={filtered} dark={dark} mode={mode} provinceLabel={provinceLabel} focus={focus} />
        <div className="pointer-events-none absolute bottom-6 left-2 z-[1000] max-w-[calc(100%-1rem)]">
          {mode === "dots" ? (
            <MagnitudeLegend dark={dark} />
          ) : (
            <div className="rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm">
              Heatmap: brighter = more quakes in that area
            </div>
          )}
        </div>
        <div className="absolute right-2 top-2 z-[1000] flex gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border bg-card text-sm shadow" role="group" aria-label="Map style">
            {(["dots", "heat"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`px-3 py-2 ${mode === m ? "bg-accent text-white dark:text-slate-900" : "hover:bg-foreground/5"}`}
              >
                {m === "dots" ? "Dots" : "Heatmap"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow lg:hidden"
          >
            Filters
          </button>
        </div>
      </section>

      <aside className="border-border px-4 py-4 lg:order-1 lg:w-96 lg:shrink-0 lg:overflow-y-auto lg:border-r">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold tracking-tight">Linog Map</h1>
          <p className="mt-1 text-sm text-muted">
            Earthquakes M4.5+ in and around the Philippines since 1900, from the USGS catalog.
          </p>
          <p className="mt-3 text-sm" aria-live="polite">
            {countLine}
          </p>
          <div className="mt-5">{filters}</div>
        </div>

        <div className="mt-2 flex gap-1 border-b border-border lg:mt-6" role="tablist" aria-label="Details">
          {(["charts", "strongest"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                tab === t ? "border-accent font-medium" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t === "charts" ? "Charts" : "Strongest 20"}
            </button>
          ))}
        </div>
        <div className="pt-4" role="tabpanel">
          {!data ? null : tab === "charts" ? (
            <QuakeCharts
              quakes={filtered}
              provinceNames={provinceNames}
              yearFrom={deferredFilter.yearFrom}
              yearTo={deferredFilter.yearTo}
              dark={dark}
            />
          ) : (
            <StrongestList quakes={filtered} dark={dark} label={provinceLabel} onPick={pickQuake} />
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          Before 1973 the catalog mostly lists bigger quakes, so older years look quieter than they were. USGS
          magnitudes can differ slightly from PHIVOLCS. &quot;Offshore, near&quot; = within 100 km of that province.
        </p>
      </aside>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter quakes">
        {filters}
      </BottomSheet>
    </div>
  );
}
