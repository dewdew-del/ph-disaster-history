import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import MainNav from "./nav/MainNav";
import SiteSearch from "./nav/SiteSearch";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-[1100] bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 pl-4 pr-2 md:pl-8 md:pr-6">
        <Link href="/" className="mr-auto shrink-0 font-display text-[1.375rem] leading-none">
          PH Disaster History
        </Link>
        <MainNav />
        <div className="flex items-center">
          <SiteSearch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
