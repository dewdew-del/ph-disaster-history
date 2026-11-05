"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import MapLoading from "@/components/map/MapLoading";
import MagnitudeLegend from "@/components/map/MagnitudeLegend";
import MapSidePanel, { FactStrip } from "@/components/map/MapSidePanel";
import { FULL_MAP, FiltersButton, MapPill, MapTopBar } from "@/components/map/MapControls";
import { Chip, ChipGroup, Segmented } from "@/components/ui/Chips";
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
    <div className="pb-12">
      <h1 className="sr-only">Linog · Earthquakes of the Philippines since 1900</h1>
      <section id="quake-map" className={`${FULL_MAP} scroll-mt-14 bg-surface`} aria-label="Earthquake map">
        <LinogMap
          quakes={filtered}
          dark={dark}
          mode={mode}
          provinceLabel={provinceLabel}
          focus={focus}
          onSelect={select}
          selectedId={selected?.id ?? null}
        />
        <MapTopBar>
          <MapPill>
            {data ? (
              <>
                <strong className="font-semibold tabular-nums">{formatNumber(filtered.length)}</strong> earthquakes
                <span className="hidden text-muted sm:inline">
                  {" "}
                  · {filter.yearFrom}–{filter.yearTo}
                </span>
              </>
            ) : error ? (
              <span className="text-red-600">Could not load quakes</span>
            ) : (
              "Loading quakes…"
            )}
          </MapPill>
          <FiltersButton count={changed + Number(mode === "heat")} onClick={() => setDrawerOpen(true)} />
        </MapTopBar>
        <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] max-w-[calc(100%-4.5rem)] lg:left-4">
          {mode === "dots" ? (
            <MagnitudeLegend dark={dark} />
          ) : (
            <div className="rounded-full border border-border bg-background/95 px-3.5 py-1.5 text-xs">Brighter = more quakes</div>
          )}
        </div>
        {selected && (
          <MapSidePanel label="Selected earthquake" onClose={() => setSelected(null)}>
            <QuakeDetails q={selected} label={provinceLabel(selected)} slug={selected.prov >= 0 ? data?.provinces[selected.prov] : undefined} />
          </MapSidePanel>
        )}
      </section>

      <div className="mx-auto mt-12 grid max-w-[1440px] gap-12 px-4 md:px-8 lg:grid-cols-2">
        <section>
          <h2 className="text-[2rem] leading-tight">Strongest earthquakes</h2>
          <div className="mt-3">{data && <StrongestList quakes={filtered} dark={dark} label={provinceLabel} onPick={pickFromList} />}</div>
        </section>
        <section>
          <h2 className="text-[2rem] leading-tight">By year and province</h2>
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
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onClear={changed > 0 || mode === "heat" ? () => {
                reset();
                setMode("dots");
              } : undefined}
        title="Filters"
      >
        <Segmented
          label="Show as"
          value={mode}
          onChange={setMode}
          options={[
            { value: "dots", label: "Dots" },
            { value: "heat", label: "Heatmap" },
          ]}
        />
        <ChipGroup label="Quick picks">
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
        </ChipGroup>
        <QuakeFilters filter={filter} onChange={setFilter} firstYear={FIRST_YEAR} lastYear={THIS_YEAR} />
        <p className="text-sm text-muted">Before the 1970s only big quakes were recorded, so older years look quieter.</p>
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
        <div className="num text-5xl">{formatMag(q.mag)}</div>
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
          <Link href={`/lugar/${slug}`} className="rounded-full border border-control py-2.5 text-center font-semibold hover:border-foreground">
            {label.replace(/^Offshore, near /, "")} history
          </Link>
        )}
      </div>
    </div>
  );
}
