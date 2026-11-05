import { formatNumber, formatUsd } from "@/lib/format";
import type { Damage } from "@/lib/types";

/** Deaths and damage as Wikipedia lists them (totals for all areas), plus the curated PH-only count. */
export default function DamageCard({ damage }: { damage: Damage | null }) {
  if (!damage) return <p className="text-muted">No damage data yet.</p>;

  const approx = damage.approximate ? <span className="ml-1.5 align-middle text-xs text-muted">(approximate)</span> : null;

  return (
    <div>
      <dl className="grid grid-cols-2 gap-6 md:grid-cols-3">
        {damage.phDeaths !== null && (
          <div>
            <dd className="num text-[2rem]">{formatNumber(damage.phDeaths)}</dd>
            <dt className="mt-1 text-sm text-muted">
              Dead in the Philippines
              {damage.phSourceUrl && (
                <>
                  {" · "}
                  <a href={damage.phSourceUrl} className="underline" target="_blank" rel="noopener noreferrer">
                    source
                  </a>
                </>
              )}
            </dt>
          </div>
        )}
        <div>
          <dd className="num text-[2rem]">
            {damage.deaths !== null ? formatNumber(damage.deaths) : "—"}
            {damage.deaths !== null && approx}
          </dd>
          <dt className="mt-1 text-sm text-muted">Dead, total all areas</dt>
        </div>
        <div>
          <dd className="num text-[2rem]">
            {damage.damageUsd !== null ? formatUsd(damage.damageUsd).replace(" billion", "B").replace(" million", "M") : "—"}
            {damage.damageUsd !== null && approx}
          </dd>
          <dt className="mt-1 text-sm text-muted">Damage, all areas{damage.damageUsd !== null ? ` (${damage.damageYear ?? "?"} USD)` : ""}</dt>
        </div>
      </dl>
      <p className="mt-5 text-sm text-muted">
        Totals as listed on Wikipedia, for every country the storm hit. USD as listed, not adjusted for inflation.
        {damage.sourceUrl && (
          <>
            {" "}
            <a href={damage.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">
              Wikipedia source
            </a>
          </>
        )}
      </p>
      {damage.rawText && (
        <details className="mt-2 text-sm text-muted">
          <summary className="cursor-pointer">As written on Wikipedia</summary>
          <p className="mt-1">{damage.rawText}</p>
        </details>
      )}
    </div>
  );
}
