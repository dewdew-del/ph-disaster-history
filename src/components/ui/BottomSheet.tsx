"use client";

import { useEffect, type ReactNode } from "react";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

/** Mobile bottom sheet (hidden on large screens, where filters sit in the sidebar). */
export default function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-8 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1 text-sm text-accent">
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
