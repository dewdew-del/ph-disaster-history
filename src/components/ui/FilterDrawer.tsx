"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = { open: boolean; onClose: () => void; onClear?: () => void; title: string; children: ReactNode };

/** Every filter for a map: a sheet from the bottom on phones, a panel from the right on large screens. */
export default function FilterDrawer({ open, onClose, onClear, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1400]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[380px] lg:rounded-none lg:border-l lg:border-border">
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <h2 className="text-[1.75rem] leading-none">{title}</h2>
          {onClear && (
            <button type="button" onClick={onClear} className="text-sm text-muted underline hover:text-foreground">
              Clear all
            </button>
          )}
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-6">{children}</div>
        <div className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="h-11 w-full rounded-full bg-foreground font-semibold text-background">
            Show results
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
