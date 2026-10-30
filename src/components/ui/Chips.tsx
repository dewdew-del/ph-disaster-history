"use client";

import type { ReactNode } from "react";

/** A row of filter chips: wraps on large screens, scrolls sideways on phones. */
export function ChipBar({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="toolbar" aria-label="Filters">
      {children}
    </div>
  );
}

/** Toggle chip: filled ink with a tick when on. */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm transition-colors ${
        on ? "bg-foreground font-semibold text-background" : "border border-control bg-background hover:bg-surface"
      }`}
    >
      {on && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
      {children}
    </button>
  );
}

/** Grey chip that opens the full filter drawer; shows how many filters are on. */
export function MoreFiltersChip({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-surface px-4 text-sm font-semibold hover:bg-raised"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      {count > 0 ? `Filters · ${count}` : "More filters"}
    </button>
  );
}
