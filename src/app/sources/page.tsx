import type { Metadata } from "next";
import Link from "next/link";
import { readPublicJson, getQuakesSummary, getTyphoonIndex } from "@/lib/data-server";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sources & credits",
  description: "Every data source, picture and method used by PH Disaster History, with licences and links.",
};

type Credit = { file: string; title: string; creator: string; license: string; licenseUrl: string | null; page: string };

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-accent underline" target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

function Block({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}

export default function SourcesPage() {
  const credits = readPublicJson<Credit[]>("images/archive/credits.json");
  const quakes = getQuakesSummary();
  const storms = getTyphoonIndex();

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-8">
      <h1 className="text-[clamp(2.25rem,1.6rem+3vw,4.5rem)] font-bold leading-none tracking-[-0.03em]">Sources &amp; credits</h1>
      <p className="mt-4 max-w-3xl text-lg">
        Everything on this site comes from open data, prepared by scripts into small static files. Data last built:{" "}
        {quakes.generated} (earthquakes) and {storms.generated} (typhoons).
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <Block title="Earthquakes">
          <p>
            <A href="https://earthquake.usgs.gov/fdsnws/event/1/">USGS Earthquake Catalog (ComCat) API</A>, U.S. Geological
            Survey. {formatNumber(quakes.total)} earthquakes of magnitude 4.5 or more since 1900, in the box 4–21.5°N,
            116–128°E. USGS data is in the public domain.
          </p>
          <p>
            USGS magnitudes can differ slightly from those published by{" "}
            <A href="https://www.phivolcs.dost.gov.ph/">PHIVOLCS</A>, the official source for Philippine earthquakes. Before
            1973 the catalog mostly lists larger quakes, so older decades look quieter than they were.
          </p>
          <p>
            Each quake is tagged with the province it is in. Quakes at sea within 100 km of a province are shown as
            &quot;offshore, near&quot; that province; farther ones, or ones USGS places in another country, are &quot;Outside
            PH&quot;.
          </p>
        </Block>

        <Block title="Typhoon tracks and strength">
          <p>
            <A href="https://www.ncei.noaa.gov/products/international-best-track-archive">
              International Best Track Archive for Climate Stewardship (IBTrACS) v04r01
            </A>
            , NOAA National Centers for Environmental Information. Knapp, K. R., et al. (2010), Bulletin of the American
            Meteorological Society, 91, 363–376; dataset{" "}
            <A href="https://doi.org/10.25921/82ty-9e16">doi:10.25921/82ty-9e16</A>.
          </p>
          <p>
            {formatNumber(storms.count)} storms from {storms.firstSeason}: every storm whose track entered the Philippine Area
            of Responsibility, plus storms PAGASA named whose track just misses the PAR line. The newest seasons are
            provisional in IBTrACS and are marked so.
          </p>
          <p>
            Strength uses the PAGASA scale on 10-minute winds: Tropical Depression up to 61 km/h, Tropical Storm 62–88,
            Severe Tropical Storm 89–117, Typhoon 118–184, Super Typhoon 185 or more. Winds are from the Japan
            Meteorological Agency; when it has none, the JTWC 1-minute wind × 0.88 is used and marked &quot;estimated&quot;.
          </p>
          <p>
            &quot;Approximate path area&quot; means provinces within about 50 km of the track. It is not an official list of
            affected areas: rain and wind reach much farther.
          </p>
        </Block>

        <Block title="Local names, deaths and damage">
          <p>
            <A href="https://en.wikipedia.org/">Wikipedia</A>, read through the MediaWiki API: the &quot;Pacific typhoon
            season&quot; page of each year from 1990 for PAGASA names, each storm&apos;s own article for deaths and damage, and
            the <A href="https://en.wikipedia.org/wiki/List_of_retired_Philippine_typhoon_names">list of retired Philippine typhoon names</A>
            . Wikipedia text is available under CC BY-SA 4.0; each storm page links to the article it came from.
          </p>
          <p>
            Deaths and damage from article infoboxes are totals for every country a storm hit, shown in US dollars as
            Wikipedia lists them (not adjusted for inflation). Values that could not be read cleanly (ranges, &quot;at
            least&quot;) are marked &quot;approximate&quot;. The deadliest list only uses death counts for the Philippines from
            the retired-names list, which cites PAGASA, NDRRMC/NDCC and EM-DAT.
          </p>
        </Block>

        <Block title="Maps">
          <p>
            Province boundaries:{" "}
            <A href="https://github.com/faeldon/philippines-json-maps">faeldon/philippines-json-maps</A> (MIT licence), based
            on the Philippine Standard Geographic Code of the Philippine Statistics Authority. The four NCR districts are
            joined as Metro Manila and the City of Isabela as part of Basilan.
          </p>
          <p>
            Map tiles © <A href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</A> (ODbL), drawn with{" "}
            <A href="https://leafletjs.com/">Leaflet</A>. Charts by <A href="https://recharts.org/">Recharts</A>.
          </p>
        </Block>

        <Block id="pictures" title="Pictures">
          <p>From Wikimedia Commons. The satellite images show each storm itself; the photographs show the earthquakes&apos; damage.</p>
          <ul className="space-y-2">
            {credits.map((c) => (
              <li key={c.file}>
                <A href={c.page}>{c.title}</A> by {c.creator},{" "}
                {c.licenseUrl ? <A href={c.licenseUrl}>{c.license}</A> : c.license}
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Official sources">
          <p>
            This is a history, not a warning service. For warnings and official figures, use{" "}
            <A href="https://www.pagasa.dost.gov.ph/">PAGASA</A> (typhoons and weather),{" "}
            <A href="https://www.phivolcs.dost.gov.ph/">PHIVOLCS</A> (earthquakes) and{" "}
            <A href="https://ndrrmc.gov.ph/">NDRRMC</A> (disaster reports). For a second earthquake catalog, see{" "}
            <A href="https://www.emsc-csem.org/">EMSC</A>.
          </p>
          <p>
            Built by <A href="https://github.com/dewdew-del">dewdew-del</A> as a portfolio project.{" "}
            <Link href="/" className="text-accent underline">
              Back to the start
            </Link>
          </p>
        </Block>
      </div>
    </div>
  );
}
