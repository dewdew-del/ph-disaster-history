import { formatNumber, formatUsd } from "@/lib/format";
import type { Damage } from "@/lib/types";

/** Deaths and damage as Wikipedia lists them (totals for all areas), plus the curated PH-only count. */
export default function DamageCard({ damage }: { damage: Damage | null }) {
  if (!damage) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Deaths and damage</h2>
        <p className="mt-2 text-sm text-muted">No damage data yet.</p>
      </section>
    );
  }
  const approx = damage.approximate ? (
    <span className="ml-1.5 rounded bg-foreground/10 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted">
      approximate
    </span>
  ) : null;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Deaths and damage</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {damage.phDeaths !== null && (
          <div className="col-span-2">
            <dt className="text-xs text-muted">Deaths in the Philippines</dt>
            <dd className="text-2xl font-semibold tabular-nums">{formatNumber(damage.phDeaths)}</dd>
            {damage.phSourceUrl && (
              <a href={damage.phSourceUrl} className="text-xs text-accent underline" target="_blank" rel="noopener noreferrer">
                Source ↗
              </a>
            )}
          </div>
        )}
        <div>
          <dt className="text-xs text-muted">Deaths, total all areas</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {damage.deaths !== null ? formatNumber(damage.deaths) : "—"}
            {damage.deaths !== null && approx}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Damage, total all areas</dt>
          <dd className="text-lg font-semibold">
            {damage.damageUsd !== null ? (
              <>
                {formatUsd(damage.damageUsd)}
                <span className="text-sm font-normal text-muted"> ({damage.damageYear ?? "?"} USD)</span>
                {approx}
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">
        Totals as listed on Wikipedia, for every country the storm hit. USD as listed, not adjusted for inflation.
        {damage.sourceUrl && (
          <>
            {" "}
            <a href={damage.sourceUrl} className="text-accent underline" target="_blank" rel="noopener noreferrer">
              Wikipedia source ↗
            </a>
          </>
        )}
      </p>
      {damage.rawText && (
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer">As written on Wikipedia</summary>
          <p className="mt-1">{damage.rawText}</p>
        </details>
      )}
    </section>
  );
}
