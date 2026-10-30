"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icons";
import { NAV, isActive } from "./nav";

/** Phone navigation: four tabs fixed to the bottom of the screen (hidden on large screens). */
export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-[1100] grid grid-cols-4 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs ${
              active ? "font-semibold text-foreground" : "text-muted"
            }`}
          >
            <span className={active ? "text-accent" : undefined}>
              <Icon name={item.icon} size={24} />
            </span>
            {item.tab}
          </Link>
        );
      })}
    </nav>
  );
}
