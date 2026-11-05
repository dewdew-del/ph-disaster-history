import Link from "next/link";

/** One quiet line: where the data comes from, where to get real warnings, and the full sources page. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-border text-sm text-muted">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-5 md:px-8">
        <span>Data: USGS, IBTrACS, PAGASA, Wikipedia · Map © OpenStreetMap</span>
        <span>
          Not official. Warnings:{" "}
          <a className="underline hover:text-foreground" href="https://www.phivolcs.dost.gov.ph/">
            PHIVOLCS
          </a>
          ,{" "}
          <a className="underline hover:text-foreground" href="https://www.pagasa.dost.gov.ph/">
            PAGASA
          </a>
        </span>
        <span className="flex gap-6 sm:ml-auto">
          <Link className="text-foreground underline underline-offset-4 hover:no-underline" href="/sources">
            Sources
          </Link>
          <Link className="text-foreground underline underline-offset-4 hover:no-underline" href="/bagyo/retired">
            Retired names
          </Link>
        </span>
      </div>
    </footer>
  );
}
