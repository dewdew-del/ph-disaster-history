"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import CategoryLegend from "@/components/map/CategoryLegend";
import MapLoading from "@/components/map/MapLoading";
import BottomSheet from "@/components/ui/BottomSheet";
import { loadDecadeTracks, loadProvinceIndex, loadTyphoonIndex } from "@/lib/data-client";
import { formatNumber } from "@/lib/format";
import { stormLabel, type DecadeTracks, type ProvinceInfo, type TyphoonIndex } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";
import type { TrackInput } from "./TrackLayer";
import StormFilters from "./StormFilters";
import StormList from "./StormList";
import { ALL_CATS, applyStormFilter, defaultStormFilter, type StormFilter } from "./stormFilter";

const BagyoMap = dynamic(() => import("./BagyoMap"), { ssr: false, loading: () => <MapLoading /> });
const BagyoStats = dynamic(() => import("./BagyoStats"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">Loading charts…</p>,
});

/** Never draw more tracks than this at once (keeps phones smooth). */
const MAX_TRACKS = 300;
const LATEST_DECADE = Math.floor(new Date().getFullYear() / 10) * 10;

type Tab = "list" | "stats";

export default function BagyoExplorer() {
  const [index, setIndex] = useState<TyphoonIndex | null>(null);
  const [provinces, setProvinces] = useState<ProvinceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StormFilter>(() => defaultStormFilter(LATEST_DECADE));
  const [tracks, setTracks] = useState<Record<number, DecadeTracks>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("list");
  const mapRef = useRef<HTMLElement>(null);
  const dark = useIsDark();

  useEffect(() => {
    Promise.all([loadTyphoonIndex(), loadProvinceIndex()])
      .then(([idx, provs]) => {
        // Optional starting filters from the URL, e.g. /bagyo?q=yolanda or /bagyo?province=bohol
        const params = new URLSearchParams(window.location.search);
        const latest = idx.decades[idx.decades.length - 1] ?? LATEST_DECADE;
        const decadeParam = params.get("decade");
        const province = params.get("province") ?? "";
        setFilter({
          ...defaultStormFilter(latest),
          q: params.get("q") ?? "",
          decade: decadeParam === "all" || province ? "all" : decadeParam ? Number(decadeParam) : latest,
          province: provs.some((p) => p.slug === province) ? province : "",
        });
        setProvinces(provs);
        setIndex(idx);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const deferredFilter = useDeferredValue(filter);
  const provinceIdx = index && deferredFilter.province ? index.provinces.indexOf(deferredFilter.province) : -1;

  const filtered = useMemo(() => {
    if (!index) return [];
    return applyStormFilter(index.storms, deferredFilter, provinceIdx).sort((a, b) => b.start - a.start);
  }, [index, deferredFilter, provinceIdx]);

  const tooMany = filtered.length > MAX_TRACKS;
  const neededDecades = useMemo(
    () => (tooMany ? [] : [...new Set(filtered.map((s) => Math.floor(s.season / 10) * 10))]),
    [filtered, tooMany],
  );

  useEffect(() => {
    for (const d of neededDecades) {
      if (tracks[d]) continue;
      loadDecadeTracks(d)
        .then((t) => setTracks((prev) => (prev[d] ? prev : { ...prev, [d]: t })))
        .catch((e: Error) => setError(e.message));
    }
  }, [neededDecades, tracks]);

  const trackInputs: TrackInput[] = useMemo(() => {
    if (tooMany) return [];
    const out: TrackInput[] = [];
    for (const s of filtered) {
      const pts = tracks[Math.floor(s.season / 10) * 10]?.storms[s.id];
      if (pts) out.push({ id: s.id, label: `${stormLabel(s)}, ${s.season}`, points: pts });
    }
    return out;
  }, [filtered, tracks, tooMany]);

  const tracksLoading = !tooMany && neededDecades.some((d) => !tracks[d]);

  const select = useCallback((id: string) => {
    setSelectedId((cur) => (cur === id ? null : id));
  }, []);

  function selectFromList(id: string) {
    select(id);
    if (window.innerWidth < 1024) mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const reset = () => setFilter(defaultStormFilter(index?.decades[index.decades.length - 1] ?? LATEST_DECADE));
  const filters = (
    <StormFilters
      filter={filter}
      onChange={setFilter}
      onReset={reset}
      decades={index?.decades ?? []}
      provinces={provinces.length && index?.storms.some((s) => s.prov.length) ? provinces : undefined}
    />
  );

  const countLine = index ? (
    <>
      <strong className="tabular-nums">{formatNumber(filtered.length)}</strong> of{" "}
      <span className="tabular-nums">{formatNumber(index.count)}</span> storms
    </>
  ) : error ? (
    <span className="text-red-600">Could not load storm data: {error}</span>
  ) : (
    "Loading storms…"
  );

  const listKey = JSON.stringify(deferredFilter);
  const catsChanged = filter.cats.length !== ALL_CATS.length;

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-row">
      <div className="px-4 pb-3 pt-4 lg:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Bagyo · Typhoons</h1>
        <p className="mt-1 text-sm text-muted">Every storm that entered the PAR since 1945 (IBTrACS).</p>
        <p className="mt-2 flex items-baseline justify-between gap-2 text-sm">
          <span aria-live="polite">{countLine}</span>
          <Link href="/bagyo/retired" className="text-xs text-accent underline">
            Retired names →
          </Link>
        </p>
      </div>

      <section
        ref={mapRef}
        className="relative h-[55dvh] min-h-[340px] scroll-mt-14 lg:order-2 lg:h-auto lg:flex-1"
        aria-label="Typhoon track map"
      >
        <BagyoMap tracks={trackInputs} dark={dark} selectedId={selectedId} onSelect={select} />
        <div className="pointer-events-none absolute bottom-6 left-2 z-[1000] max-w-[calc(100%-1rem)]">
          <CategoryLegend dark={dark} />
        </div>
        {(tooMany || tracksLoading) && index && (
          <div className="absolute left-1/2 top-2 z-[1000] -translate-x-1/2 rounded-lg border border-border bg-card/95 px-3 py-2 text-center text-xs shadow">
            {tooMany
              ? `${formatNumber(filtered.length)} storms match. Pick a decade or search to draw their tracks (max ${MAX_TRACKS}).`
              : "Loading tracks…"}
          </div>
        )}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="absolute right-2 top-2 z-[1000] rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow lg:hidden"
        >
          Filters{catsChanged || filter.province || filter.q ? " •" : ""}
        </button>
      </section>

      <aside className="border-border px-4 py-4 lg:order-1 lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto lg:border-r">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold tracking-tight">Bagyo · Typhoons</h1>
          <p className="mt-1 text-sm text-muted">
            Every storm that entered the Philippine Area of Responsibility since 1945, from IBTrACS.
          </p>
          <p className="mt-3 flex items-baseline justify-between gap-2 text-sm">
            <span aria-live="polite">{countLine}</span>
            <Link href="/bagyo/retired" className="text-xs text-accent underline">
              Retired names →
            </Link>
          </p>
          <div className="mt-4">{filters}</div>
        </div>

        <div className="mt-2 flex gap-1 border-b border-border lg:mt-6" role="tablist" aria-label="Views">
          {(["list", "stats"] as const).map((t) => (
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
              {t === "list" ? "Storms" : "Stats"}
            </button>
          ))}
        </div>
        <div className="pt-2" role="tabpanel">
          {!index ? null : tab === "list" ? (
            <StormList key={listKey} storms={filtered} selectedId={selectedId} onSelect={selectFromList} />
          ) : (
            <div className="pt-2">
              <BagyoStats filtered={filtered} all={index.storms} dark={dark} />
            </div>
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          Strength uses the PAGASA scale on 10-minute winds (JMA). When JMA has no wind, the JTWC 1-minute wind × 0.88 is
          used and marked &quot;est.&quot; Local names come from Wikipedia (1990 on). Death and damage numbers are Wikipedia
          totals for all areas unless marked &quot;in PH&quot;.
        </p>
      </aside>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter storms">
        {filters}
      </BottomSheet>
    </div>
  );
}
