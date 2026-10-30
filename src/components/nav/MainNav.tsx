"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "./nav";

/** Desktop section links; the current section gets a grey pill. */
export default function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-base ${
              active ? "bg-raised font-semibold text-foreground" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {item.label}
            {item.english && <span className="hidden xl:inline"> · {item.english}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
