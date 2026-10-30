import Link from "next/link";

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="underline hover:text-foreground" href={href}>
    {children}
  </a>
);

export default function SiteFooter() {
  return (
    <footer className="bg-surface text-sm text-muted">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-baseline gap-x-8 gap-y-2 px-4 py-6 md:px-8">
        <span className="font-semibold text-foreground">PH Disaster History</span>
        <span>
          Data: <A href="https://earthquake.usgs.gov/fdsnws/event/1/">USGS</A> ·{" "}
          <A href="https://www.ncei.noaa.gov/products/international-best-track-archive">IBTrACS</A> ·{" "}
          <A href="https://en.wikipedia.org/">Wikipedia</A> · <A href="https://github.com/faeldon/philippines-json-maps">PSGC</A> ·
          Map © <A href="https://www.openstreetmap.org/copyright">OpenStreetMap</A>
        </span>
        <span>
          Not official. Warnings: <A href="https://www.phivolcs.dost.gov.ph/">PHIVOLCS</A>,{" "}
          <A href="https://www.pagasa.dost.gov.ph/">PAGASA</A>
        </span>
        <Link className="font-semibold text-accent hover:underline sm:ml-auto" href="/sources">
          All sources →
        </Link>
      </div>
    </footer>
  );
}
