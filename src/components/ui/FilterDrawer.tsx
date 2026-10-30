"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

/** All filters: a sheet from the bottom on phones, a panel from the right on large screens. */
export default function FilterDrawer({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1400]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-background p-5 pb-10 shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[400px] lg:rounded-none lg:pb-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="h-10 rounded-full bg-foreground px-5 font-semibold text-background">
            Done
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
