"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import CategoryLegend from "@/components/map/CategoryLegend";
import MapLoading from "@/components/map/MapLoading";
import MapSidePanel, { FactStrip } from "@/components/map/MapSidePanel";
import { FULL_MAP, FiltersButton, MapPill, MapTopBar } from "@/components/map/MapControls";
import { Chip, ChipGroup } from "@/components/ui/Chips";
import FilterDrawer from "@/components/ui/FilterDrawer";
import { loadDecadeTracks, loadJson, loadProvinceIndex, loadTyphoonIndex } from "@/lib/data-client";
import { formatDateRangePH, formatNumber } from "@/lib/format";
import { categoryColor, categoryName } from "@/lib/scales";
import { type DecadeTracks, type ProvinceInfo, type TyphoonIndex, type TyphoonSummary, stormLabel } from "@/lib/types";
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

type Photo = { file: string; date: string; source: string };

const onlySuper = (f: StormFilter) => f.cats.length === 1 && f.cats[0] === "STY";

function changedCount(f: StormFilter, latest: number): number {
  return (
    Number(f.q.trim() !== "") +
    Number(f.decade !== latest || f.year !== "all") +
    Number(f.cats.length !== ALL_CATS.length) +
    Number(f.province !== "") +
    Number(f.deadly) +
    Number(f.retired)
  );
}

export default function BagyoExplorer() {
  const [index, setIndex] = useState<TyphoonIndex | null>(null);
  const [provinces, setProvinces] = useState<ProvinceInfo[]>([]);
  const [photos, setPhotos] = useState<Record<string, Photo>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StormFilter>(() => defaultStormFilter(LATEST_DECADE));
  const [tracks, setTracks] = useState<Record<number, DecadeTracks>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    loadJson<Record<string, Photo>>("/data/typhoons/satellite.json")
      .then(setPhotos)
      .catch(() => {});
  }, []);

  const latest = index?.decades[index.decades.length - 1] ?? LATEST_DECADE;
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
  const selected = useMemo(() => index?.storms.find((s) => s.id === selectedId) ?? null, [index, selectedId]);

  const select = useCallback((id: string) => setSelectedId((cur) => (cur === id ? null : id)), []);

  function selectFromList(id: string) {
    setSelectedId(id);
    document.getElementById("storm-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const reset = () => setFilter(defaultStormFilter(latest));
  const changed = changedCount(filter, latest);
  const latestOn = filter.decade === latest && filter.year === "all";

  const provinceName = provinces.find((p) => p.slug === filter.province)?.name;
  const scopeLabel = filter.q.trim()
    ? `“${filter.q.trim()}”`
    : [
        filter.decade === "all" ? "1945–now" : filter.year !== "all" ? String(filter.year) : `${filter.decade}s`,
        provinceName ? `hit ${provinceName}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <div className="pb-12">
      <h1 className="sr-only">Bagyo · Typhoons that entered the PAR since 1945</h1>
      <section id="storm-map" className={`${FULL_MAP} scroll-mt-14 bg-surface`} aria-label="Typhoon track map">
        <BagyoMap tracks={trackInputs} dark={dark} selectedId={selectedId} onSelect={select} />
        <MapTopBar>
          <MapPill>
            {index ? (
              <>
                <strong className="font-semibold tabular-nums">{formatNumber(filtered.length)}</strong> storms
                <span className="hidden text-muted sm:inline"> · {scopeLabel}</span>
              </>
            ) : error ? (
              <span className="text-red-600">Could not load storms</span>
            ) : (
              "Loading storms…"
            )}
          </MapPill>
          <FiltersButton count={changed} onClick={() => setDrawerOpen(true)} />
        </MapTopBar>
        <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] max-w-[calc(100%-4.5rem)] lg:left-4">
          <CategoryLegend dark={dark} />
        </div>
        {(tooMany || tracksLoading) && index && (
          <div className="absolute left-1/2 top-16 z-[1000] w-max max-w-[90%] -translate-x-1/2 rounded-md bg-surface px-4 py-2 text-center text-sm shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
            {tooMany ? `${formatNumber(filtered.length)} storms: pick a decade in Filters to draw them` : "Loading tracks…"}
          </div>
        )}
        {selected && (
          <MapSidePanel label="Selected storm" onClose={() => setSelectedId(null)}>
            <StormDetails s={selected} photo={photos[selected.id]} dark={dark} />
          </MapSidePanel>
        )}
      </section>

      <div className="mx-auto mt-12 grid max-w-[1440px] gap-12 px-4 md:px-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <h2 className="text-[2rem] leading-tight">Storms on the map</h2>
          <div className="mt-3">
            {index && <StormList key={JSON.stringify(deferredFilter)} storms={filtered} selectedId={selectedId} onSelect={selectFromList} />}
          </div>
        </section>
        <section>
          <h2 className="text-[2rem] leading-tight">Stats</h2>
          <div className="mt-4">{index && <BagyoStats filtered={filtered} all={index.storms} dark={dark} />}</div>
        </section>
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onClear={changed > 0 ? reset : undefined} title="Filters">
        <ChipGroup label="Quick picks">
          <Chip on={latestOn} onClick={() => setFilter({ ...filter, decade: latestOn ? "all" : latest, year: "all" })}>
            {latest}s
          </Chip>
          <Chip
            on={onlySuper(filter)}
            onClick={() => setFilter({ ...filter, cats: onlySuper(filter) ? [...ALL_CATS] : ["STY"] })}
          >
            Super typhoons
          </Chip>
          <Chip on={filter.deadly} onClick={() => setFilter({ ...filter, deadly: !filter.deadly })}>
            Deadly
          </Chip>
          <Chip on={filter.retired} onClick={() => setFilter({ ...filter, retired: !filter.retired })}>
            Retired names
          </Chip>
        </ChipGroup>
        <StormFilters filter={filter} onChange={setFilter} decades={index?.decades ?? []} provinces={provinces.length ? provinces : undefined} />
        <p className="text-sm text-muted">
          Strength uses the PAGASA scale. See the{" "}
          <Link href="/bagyo/retired" className="underline">
            retired names
          </Link>{" "}
          or the{" "}
          <Link href="/sources" className="underline">
            sources
          </Link>
          .
        </p>
      </FilterDrawer>
    </div>
  );
}

function StormDetails({ s, photo, dark }: { s: TyphoonSummary; photo?: Photo; dark: boolean }) {
  const deaths = s.phDeaths ?? s.deaths;
  const photoDate = photo
    ? new Date(`${photo.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : null;
  return (
    <div className="flex h-full flex-col">
      {photo && (
        <div className="relative h-28 shrink-0 bg-[#0b1530] lg:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, image already sized */}
          <img src={photo.file} alt={`Satellite photo of ${stormLabel(s)}`} className="h-full w-full object-cover" />
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white">
            {photoDate} · {photo.source}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="pr-10">
          <div className="font-display text-[2rem] leading-tight">
            {s.local ?? s.name ?? "Unnamed storm"}{" "}
            {s.local && s.name && <span className="font-normal text-muted">({s.name})</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: categoryColor(s.cat, dark) }} />
            {categoryName(s.cat)} · {formatDateRangePH(s.start, s.end)}
          </div>
        </div>
        <FactStrip
          items={[
            [s.kmh !== null ? String(s.kmh) : "—", "km/h peak"],
            [deaths !== null ? formatNumber(deaths) : "—", s.phDeaths !== null ? "dead in PH" : "dead, all areas"],
            [String(s.prov.length), "provinces"],
          ]}
        />
        <Link href={`/bagyo/${s.id}`} className="mt-auto rounded-md bg-foreground py-3 text-center font-semibold text-background">
          Open full page →
        </Link>
      </div>
    </div>
  );
}
