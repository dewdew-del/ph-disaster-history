"use client";

import { useIsDark } from "@/lib/useIsDark";

export default function ThemeToggle() {
  const dark = useIsDark();

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Storage can be blocked (private mode); the toggle still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-foreground/5"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? "☀︎" : "☾"}
    </button>
  );
}
