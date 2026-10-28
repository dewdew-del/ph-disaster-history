"use client";

import { useSyncExternalStore } from "react";

// The theme lives as the `dark` class on <html>; this hook re-renders when it changes.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDarkNow = () => document.documentElement.classList.contains("dark");

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, isDarkNow, () => false);
}
