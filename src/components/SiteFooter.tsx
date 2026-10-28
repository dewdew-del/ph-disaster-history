import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-surface text-sm text-muted">
      <div className="mx-auto max-w-[1440px] px-5 py-8 leading-relaxed md:px-8">
        <p className="text-base font-semibold text-foreground">PH Disaster History</p>
        <p className="mt-2">
          Data: <a className="underline" href="https://earthquake.usgs.gov/fdsnws/event/1/">USGS Earthquake Catalog</a>
          {" · "}
          <a className="underline" href="https://www.ncei.noaa.gov/products/international-best-track-archive">IBTrACS (NOAA NCEI)</a>
          {" · "}
          <a className="underline" href="https://en.wikipedia.org/">Wikipedia</a> (names, damage)
          {" · "}
          <a className="underline" href="https://github.com/faeldon/philippines-json-maps">PSGC boundaries via faeldon/philippines-json-maps</a>
          {" · "}
          Map © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
          {". "}
          <Link className="font-medium text-accent underline" href="/sources">
            All sources &amp; credits
          </Link>
        </p>
        <p className="mt-1">
          Not an official source. For warnings and official data, see{" "}
          <a className="underline" href="https://www.phivolcs.dost.gov.ph/">PHIVOLCS</a> and{" "}
          <a className="underline" href="https://www.pagasa.dost.gov.ph/">PAGASA</a>.
        </p>
      </div>
    </footer>
  );
}
