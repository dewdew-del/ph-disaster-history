"use client";

import type { ReactNode } from "react";

type Props = { label: string; onClose: () => void; children: ReactNode };

/**
 * Details of the selected quake or storm. On large screens it floats on the right side of the map;
 * on phones it is a sheet above the bottom tab bar.
 */
export default function MapSidePanel({ label, onClose, children }: Props) {
  return (
    <aside
      aria-label={label}
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[1050] max-h-[50dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-background shadow-[0_-8px_24px_rgba(0,0,0,0.12)] lg:absolute lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-4 lg:max-h-none lg:w-[360px] lg:rounded-xl lg:border lg:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded bg-control lg:hidden" aria-hidden />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-lg text-muted hover:text-foreground"
      >
        ×
      </button>
      {children}
    </aside>
  );
}

/** Two or three big numbers in a row between hairlines. */
export function FactStrip({ items }: { items: [string, string][] }) {
  return (
    <div className="grid border-y border-border" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(([value, label], i) => (
        <div key={label} className={`py-3 ${i > 0 ? "border-l border-border pl-3" : ""}`}>
          <div className="num text-[1.75rem]">{value}</div>
          <div className="mt-1 text-xs text-muted">{label}</div>
        </div>
      ))}
    </div>
  );
}
