import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/linog", label: "Linog Map" },
  { href: "/bagyo", label: "Bagyo Archive" },
  { href: "/lugar", label: "My Place" },
  { href: "/sources", label: "Sources" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-[1100] bg-card">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-5 md:px-8">
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          PH Disaster History
        </Link>
        <nav className="no-scrollbar flex flex-1 gap-1 overflow-x-auto text-sm" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted hover:bg-foreground/5 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
