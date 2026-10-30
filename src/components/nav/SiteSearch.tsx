"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { loadJson } from "@/lib/data-client";
import { categoryColor, categoryName } from "@/lib/scales";
import type { CatCode } from "@/lib/types";
import { useIsDark } from "@/lib/useIsDark";
import Icon from "./Icons";

type StormRow = [string, string | null, string | null, number, CatCode];
type ProvinceRow = [string, string, string];
type Index = { storms: StormRow[]; provinces: ProvinceRow[] };
type Result =
  | { kind: "province"; href: string; name: string; region: string }
  | { kind: "storm"; href: string; local: string | null; name: string | null; season: number; cat: CatCode };

const loadIndex = () => loadJson<Index>("/search-index.json");

function words(s: string | null): string[] {
  return s ? s.toLowerCase().split(/[\s()-]+/).filter(Boolean) : [];
}

function search(index: Index, raw: string): Result[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const hit = (s: string | null) => words(s).some((w) => w.startsWith(q)) || (q.length > 2 && !!s && s.toLowerCase().includes(q));
  const provinces: Result[] = index.provinces
    .filter(([, name]) => hit(name))
    .slice(0, 4)
    .map(([slug, name, region]) => ({ kind: "province", href: `/lugar/${slug}`, name, region: region.replace(/\s*\(.*\)$/, "") }));
  const year = /^\d{4}$/.test(q) ? Number(q) : null;
  const storms: Result[] = index.storms
    .filter(([, local, name, season]) => (year ? season === year : hit(local) || hit(name)))
    .sort((a, b) => b[3] - a[3])
    .slice(0, provinces.length ? 6 : 8)
    .map(([id, local, name, season, cat]) => ({ kind: "storm", href: `/bagyo/${id}`, local, name, season, cat }));
  return [...provinces, ...storms];
}

function stormTitle(r: Extract<Result, { kind: "storm" }>) {
  if (r.local && r.name) return { main: r.local, sub: r.name };
  return { main: r.local ?? r.name ?? "Unnamed storm", sub: null };
}

/** Header search for storms and provinces. Inline box on large screens, full-screen sheet on phones. */
export default function SiteSearch() {
  const router = useRouter();
  const dark = useIsDark();
  const listId = useId();
  const [index, setIndex] = useState<Index | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (index ? search(index, query) : []), [index, query]);

  function warm() {
    if (!index) loadIndex().then(setIndex).catch(() => {});
  }

  function go(r: Result) {
    setOpen(false);
    setSheet(false);
    setQuery("");
    router.push(r.href);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      go(results[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setSheet(false);
      e.currentTarget.blur();
    }
  }

  // "/" jumps to the search box on large screens.
  useEffect(() => {
    function onSlash(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, []);

  // Close the dropdown when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (sheet) sheetInputRef.current?.focus();
  }, [sheet]);

  const list = (
    <Results
      id={listId}
      results={results}
      cursor={cursor}
      query={query}
      loading={!index && !!query}
      dark={dark}
      onPick={go}
      onHover={setCursor}
    />
  );

  const inputProps = {
    type: "search" as const,
    value: query,
    placeholder: "Search a typhoon or province",
    "aria-label": "Search a typhoon or province",
    role: "combobox" as const,
    "aria-expanded": results.length > 0,
    "aria-controls": listId,
    "aria-autocomplete": "list" as const,
    autoComplete: "off",
    spellCheck: false,
    onFocus: () => {
      warm();
      setOpen(true);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      warm();
      setQuery(e.target.value);
      setCursor(0);
      setOpen(true);
    },
    onKeyDown: onKey,
  };

  return (
    <>
      {/* Large screens: inline box with a dropdown */}
      <div ref={boxRef} className="relative hidden w-[clamp(240px,26vw,400px)] lg:block">
        <label className="flex h-11 items-center gap-2.5 rounded-xl border border-control bg-surface px-3.5 text-muted focus-within:border-foreground">
          <Icon name="search" size={18} />
          <input ref={inputRef} {...inputProps} className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted" />
        </label>
        {open && query.trim() && (
          <div className="absolute right-0 top-[52px] z-[1300] w-[460px] max-w-[90vw] rounded-xl border border-border bg-background py-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
            {list}
          </div>
        )}
      </div>

      {/* Phones: icon button that opens a full-screen search */}
      <button
        type="button"
        onClick={() => {
          warm();
          setSheet(true);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface lg:hidden"
        aria-label="Search a typhoon or province"
      >
        <Icon name="search" size={22} />
      </button>
      {sheet &&
        createPortal(
        <div className="fixed inset-0 z-[1300] flex flex-col bg-background lg:hidden" role="dialog" aria-modal="true" aria-label="Search">
          <div className="flex h-16 items-center gap-2 border-b border-border pl-3 pr-2">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-control bg-surface px-3 text-muted">
              <Icon name="search" size={20} />
              <input ref={sheetInputRef} {...inputProps} placeholder="Typhoon or province" className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted" />
            </label>
            <button type="button" onClick={() => setSheet(false)} className="h-11 px-3 font-semibold text-accent">
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-8">{list}</div>
        </div>,
          document.body,
        )}
    </>
  );
}

function Results(props: {
  id: string;
  results: Result[];
  cursor: number;
  query: string;
  loading: boolean;
  dark: boolean;
  onPick: (r: Result) => void;
  onHover: (i: number) => void;
}) {
  const { id, results, cursor, query, loading, dark, onPick, onHover } = props;
  if (!query.trim()) return <div id={id} role="listbox" />;
  if (loading) return <p className="px-4 py-3 text-sm text-muted">Loading…</p>;
  if (!results.length)
    return (
      <p id={id} className="px-4 py-3 text-sm text-muted">
        No typhoon or province named “{query.trim()}”
      </p>
    );
  const firstStorm = results.findIndex((r) => r.kind === "storm");
  return (
    <ul id={id} role="listbox" aria-label="Search results">
      {results.map((r, i) => (
        <li key={r.href} role="presentation">
          {i === 0 && r.kind === "province" && <p className="px-4 pb-1 pt-2 text-xs text-muted">Provinces</p>}
          {i === firstStorm && <p className="px-4 pb-1 pt-3 text-xs text-muted">Typhoons</p>}
          <button
            type="button"
            role="option"
            aria-selected={i === cursor}
            onMouseEnter={() => onHover(i)}
            onClick={() => onPick(r)}
            className={`flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left ${i === cursor ? "bg-surface" : ""}`}
          >
            {r.kind === "province" ? (
              <>
                <span className="text-muted">
                  <Icon name="pin" size={18} />
                </span>
                <span className="flex-1 font-semibold">{r.name}</span>
                <span className="text-sm text-muted">{r.region}</span>
              </>
            ) : (
              <>
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: categoryColor(r.cat, dark) }} />
                <span className="flex-1">
                  <span className="font-semibold">{stormTitle(r).main}</span>
                  {stormTitle(r).sub && <span className="text-muted"> ({stormTitle(r).sub})</span>}
                </span>
                <span className="text-sm text-muted">
                  {r.cat === "UNK" ? "" : `${categoryName(r.cat)} · `}
                  {r.season}
                </span>
              </>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
