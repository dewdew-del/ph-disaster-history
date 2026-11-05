"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "./nav";

/** Desktop section links: plain text, the current section in ink and bold. */
export default function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.english}
            className={`whitespace-nowrap py-2 text-[0.9375rem] ${active ? "font-semibold text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
