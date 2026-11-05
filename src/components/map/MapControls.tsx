"use client";

import type { ReactNode } from "react";

/** Row of controls floating over the top of a full-screen map. */
export function MapTopBar({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex items-start justify-between gap-2 lg:inset-x-auto lg:left-4 lg:top-4 lg:justify-start">
      {children}
    </div>
  );
}

const pill =
  "pointer-events-auto flex h-10 items-center rounded-full border border-border bg-background/95 px-4 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur";

/** The page title as a pill, e.g. "15,778 earthquakes · 1900–2026". */
export function MapPill({ children }: { children: ReactNode }) {
  return (
    <div className={`${pill} min-w-0`} aria-live="polite">
      <span className="truncate">{children}</span>
    </div>
  );
}

/** Opens the filters panel; shows how many filters are on. */
export function FiltersButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${pill} shrink-0 gap-2 font-semibold hover:border-foreground`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      Filters
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xs text-background">{count}</span>
      )}
    </button>
  );
}

/** A map that fills the screen under the header (and above the phone tab bar). */
export const FULL_MAP = "relative h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] min-h-[420px] lg:h-[calc(100dvh-3.5rem)]";
