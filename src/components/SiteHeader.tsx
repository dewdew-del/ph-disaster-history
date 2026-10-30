import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import MainNav from "./nav/MainNav";
import SiteSearch from "./nav/SiteSearch";
import { Mark } from "./nav/Icons";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-[1100] border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 pl-4 pr-2 md:px-8 lg:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight">
          <Mark size={26} />
          <span>PH Disaster History</span>
        </Link>
        <MainNav />
        <div className="flex-1" />
        <SiteSearch />
        <ThemeToggle />
      </div>
    </header>
  );
}
