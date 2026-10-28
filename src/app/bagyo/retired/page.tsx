import type { Metadata } from "next";
import Link from "next/link";
import CategoryBadge from "@/components/bagyo/CategoryBadge";
import { readPublicJson } from "@/lib/data-server";
import { formatNumber, formatPhpListed } from "@/lib/format";
import type { RetiredName } from "@/lib/types";

export const metadata: Metadata = {
  title: "Retired PAGASA names",
  description:
    "Local typhoon names that PAGASA retired after deadly or destructive storms, like Yolanda, Ondoy, Sendong and Odette.",
};

const SOURCE = "https://en.wikipedia.org/wiki/List_of_retired_Philippine_typhoon_names";

export default function RetiredPage() {
  const rows = readPublicJson<RetiredName[]>("data/typhoons/retired.json");
  const decades = [...new Set(rows.map((r) => Math.floor(r.year / 10) * 10))].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/bagyo" className="hover:underline">
          Bagyo Archive
        </Link>{" "}
        › Retired names
      </nav>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Retired PAGASA names</h1>
      <p className="mt-2 max-w-3xl text-muted">
        PAGASA removes a local name from its list when a storm was especially deadly or destructive (in recent decades,
        usually at least 300 deaths or ₱1 billion in damage). The name is never used again, so &quot;Yolanda&quot;
        always means the 2013 super typhoon. {rows.length} names are listed here.
      </p>

      {decades.map((decade) => {
        const list = rows.filter((r) => Math.floor(r.year / 10) * 10 === decade).sort((a, b) => b.year - a.year);
        return (
          <section key={decade} className="mt-8">
            <h2 className="text-lg font-semibold">{decade}s</h2>
            <div className="mt-2 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-foreground/5 text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Year</th>
                    <th className="px-3 py-2 font-medium">Peak</th>
                    <th className="px-3 py-2 text-right font-medium">Deaths in PH</th>
                    <th className="px-3 py-2 text-right font-medium">Damage (₱, as listed)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((r) => (
                    <tr key={`${r.local}-${r.year}`} className="align-top">
                      <td className="px-3 py-2">
                        {r.id ? (
                          <Link href={`/bagyo/${r.id}`} className="font-medium text-accent hover:underline">
                            {r.local}
                          </Link>
                        ) : (
                          <span className="font-medium">{r.local}</span>
                        )}
                        {r.intl && <span className="text-muted"> ({r.intl})</span>}
                        {!r.id && <div className="text-xs text-muted">No IBTrACS track, so no storm page</div>}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{r.year}</td>
                      <td className="px-3 py-2">
                        {r.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CategoryBadge cat={r.cat} />
                            {r.kmh !== null && <span className="text-xs text-muted tabular-nums">{r.kmh} km/h</span>}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.deathsListed !== null ? formatNumber(r.deathsListed) : "—"}
                        {r.deathsListed !== null && r.deathsShared && (
                          <span title="One combined count for storms that hit together" className="text-muted">
                            *
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatPhpListed(r.damagePhp) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <p className="mt-8 text-xs text-muted">
        Source:{" "}
        <a href={SOURCE} className="text-accent underline" target="_blank" rel="noopener noreferrer">
          List of retired Philippine typhoon names (Wikipedia)
        </a>
        , which cites PAGASA, NDRRMC/NDCC and EM-DAT. Deaths and pesos are as listed there (not adjusted for
        inflation). * = one combined death count for storms that hit back to back (e.g. Kristine and Leon in 2024).
        Strength is from IBTrACS on the PAGASA scale.
      </p>
    </div>
  );
}
