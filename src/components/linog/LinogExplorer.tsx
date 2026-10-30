"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import MapLoading from "@/components/map/MapLoading";
import MagnitudeLegend from "@/components/map/MagnitudeLegend";
import MapSidePanel, { FactStrip } from "@/components/map/MapSidePanel";
import { Chip, ChipBar, MoreFiltersChip } from "@/components/ui/Chips";
import FilterDrawer from "@/components/ui/FilterDrawer";
import LazyVisible from "@/components/ui/LazyVisible";
import { loadQuakes } from "@/lib/data-client";
import { fastYearPH, formatDatePH, formatDateTimePH, formatMag, formatNumber } from "@/lib/format";
import { DEPTH_BANDS, depthKey } from "@/lib/scales";
import { WHERE_LAND, WHERE_OFFSHORE, toQuake, type Quake, type QuakesFile } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";
import { MAG_LIMITS, applyFilter, defaultFilter, type QuakeFilter, type QuakeWithYear } from "./filters";
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
const STRONG = 6.5;
const RECENT_FROM = THIS_YEAR - 50;

const onlyShallow = (f: QuakeFilter) => f.depths.shallow && !f.depths.intermediate && !f.depths.deep;

/** How many filters differ from the defaults (shown on the "Filters" chip). */
function changedCount(f: QuakeFilter): number {
  const d = defaultFilter(FIRST_YEAR, THIS_YEAR);
  return (
    Number(f.magMin !== d.magMin || f.magMax !== d.magMax) +
    Number(f.yearFrom !== d.yearFrom || f.yearTo !== d.yearTo) +
    Number(DEPTH_BANDS.some((b) => f.depths[b.key] !== d.depths[b.key])) +
    Number(f.landOnly)
  );
}

export default function LinogExplorer() {
  const [data, setData] = useState<QuakesFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuakeFilter>(() => defaultFilter(FIRST_YEAR, THIS_YEAR));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<MapMode>("dots");
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [selected, setSelected] = useState<Quake | null>(null);
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

  const select = useCallback((q: Quake) => {
    setMode("dots");
    setSelected(q);
  }, []);

  function pickFromList(q: Quake) {
    select(q);
    setFocus((f) => ({ id: q.id, n: (f?.n ?? 0) + 1 }));
    document.getElementById("quake-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const reset = () => setFilter(defaultFilter(FIRST_YEAR, THIS_YEAR));
  const changed = changedCount(filter);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-5 md:px-8">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">Linog · Earthquakes</h1>
          <p className="text-muted" aria-live="polite">
            {data ? (
              <>
                <strong className="text-foreground tabular-nums">{formatNumber(filtered.length)}</strong> of{" "}
                <span className="tabular-nums">{formatNumber(quakes.length)}</span> quakes since 1900
              </>
            ) : error ? (
              <span className="text-red-600">Could not load quake data: {error}</span>
            ) : (
              "Loading quakes…"
            )}
          </p>
        </div>
        <div className="flex rounded-xl bg-surface p-1" role="group" aria-label="Map style">
          {(["dots", "heat"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-lg px-4 py-1.5 text-sm ${mode === m ? "bg-background font-semibold shadow-sm" : "text-muted"}`}
            >
              {m === "dots" ? "Dots" : "Heatmap"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <ChipBar>
          <MoreFiltersChip count={changed} onClick={() => setDrawerOpen(true)} />
          <Chip
            on={filter.magMin >= STRONG}
            onClick={() => setFilter({ ...filter, magMin: filter.magMin >= STRONG ? MAG_LIMITS.min : STRONG })}
          >
            Strong (M6.5+)
          </Chip>
          <Chip
            on={filter.yearFrom >= RECENT_FROM}
            onClick={() => setFilter({ ...filter, yearFrom: filter.yearFrom >= RECENT_FROM ? FIRST_YEAR : RECENT_FROM })}
          >
            Last 50 years
          </Chip>
          <Chip
            on={onlyShallow(filter)}
            onClick={() =>
              setFilter({
                ...filter,
                depths: onlyShallow(filter)
                  ? { shallow: true, intermediate: true, deep: true }
                  : { shallow: true, intermediate: false, deep: false },
              })
            }
          >
            Shallow (under 70 km)
          </Chip>
          <Chip on={filter.landOnly} onClick={() => setFilter({ ...filter, landOnly: !filter.landOnly })}>
            On land only
          </Chip>
          {changed > 0 && (
            <button type="button" onClick={reset} className="shrink-0 px-2 text-sm text-muted underline lg:ml-auto">
              Clear
            </button>
          )}
        </ChipBar>
      </div>

      <section
        id="quake-map"
        className="relative mt-3 h-[60dvh] min-h-[380px] scroll-mt-16 overflow-hidden rounded-2xl bg-surface lg:h-[min(680px,calc(100dvh-15rem))]"
        aria-label="Earthquake map"
      >
        <LinogMap
          quakes={filtered}
          dark={dark}
          mode={mode}
          provinceLabel={provinceLabel}
          focus={focus}
          onSelect={select}
          selectedId={selected?.id ?? null}
        />
        <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] max-w-[calc(100%-1.5rem)]">
          {mode === "dots" ? (
            <MagnitudeLegend dark={dark} />
          ) : (
            <div className="rounded-full bg-background px-3.5 py-1.5 text-xs shadow-sm">Brighter = more quakes</div>
          )}
        </div>
        {selected && (
          <MapSidePanel label="Selected earthquake" onClose={() => setSelected(null)}>
            <QuakeDetails q={selected} label={provinceLabel(selected)} slug={selected.prov >= 0 ? data?.provinces[selected.prov] : undefined} />
          </MapSidePanel>
        )}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">Charts</h2>
          <div className="mt-4">
            {data && (
              <LazyVisible minHeight={600}>
                <QuakeCharts
                  quakes={filtered}
                  provinceNames={provinceNames}
                  yearFrom={deferredFilter.yearFrom}
                  yearTo={deferredFilter.yearTo}
                  dark={dark}
                />
              </LazyVisible>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Strongest earthquakes</h2>
          <div className="mt-3">{data && <StrongestList quakes={filtered} dark={dark} label={provinceLabel} onPick={pickFromList} />}</div>
        </section>
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filter quakes">
        <QuakeFilters filter={filter} onChange={setFilter} onReset={reset} firstYear={FIRST_YEAR} lastYear={THIS_YEAR} />
        <p className="mt-6 text-sm text-muted">Before the 1970s only big quakes were recorded, so older years look quieter.</p>
      </FilterDrawer>
    </div>
  );
}

function QuakeDetails({ q, label, slug }: { q: Quake; label: string; slug?: string }) {
  const depth = DEPTH_BANDS.find((b) => b.key === depthKey(q.depth));
  const time = formatDateTimePH(q.time).split(", ").pop()?.replace(" PHT", "");
  return (
    <div className="flex h-full flex-col gap-4 p-5 pt-4 lg:pt-5">
      <div className="pr-10">
        <div className="text-4xl font-bold leading-none">{formatMag(q.mag)}</div>
        <div className="mt-1.5 text-lg font-semibold leading-snug">{q.place || "Unknown location"}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
      <FactStrip
        items={[
          [formatDatePH(q.time), `${time} PH time`],
          [`${q.depth.toFixed(0)} km`, `Depth${depth ? ` (${depth.label.toLowerCase()})` : ""}`],
        ]}
      />
      <div className="mt-auto flex flex-col gap-2">
        <a
          href={`https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(q.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-foreground py-2.5 text-center font-semibold text-background"
        >
          Open on USGS →
        </a>
        {slug && (
          <Link href={`/lugar/${slug}`} className="rounded-full bg-surface py-2.5 text-center font-semibold hover:bg-raised">
            {label.replace(/^Offshore, near /, "")} history
          </Link>
        )}
      </div>
    </div>
  );
}
