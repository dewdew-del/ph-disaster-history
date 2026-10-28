// Formatting helpers. All dates and times are shown in PH time (UTC+8).

const PH_TZ = "Asia/Manila";

const dateTimeFmt = new Intl.DateTimeFormat("en-PH", {
  timeZone: PH_TZ,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("en-PH", { timeZone: PH_TZ, year: "numeric", month: "short", day: "numeric" });

const yearFmt = new Intl.DateTimeFormat("en-PH", { timeZone: PH_TZ, year: "numeric" });

/** e.g. "Oct 15, 2013, 8:12 AM PHT" (input: unix seconds) */
export function formatDateTimePH(unixSeconds: number): string {
  return `${dateTimeFmt.format(new Date(unixSeconds * 1000))} PHT`;
}

/** e.g. "Oct 15, 2013" (input: unix seconds) */
export function formatDatePH(unixSeconds: number): string {
  return dateFmt.format(new Date(unixSeconds * 1000));
}

/** Year in PH time (a quake late on Dec 31 UTC is already Jan 1 in PH). */
export function yearPH(unixSeconds: number): number {
  return Number(yearFmt.format(new Date(unixSeconds * 1000)));
}

/** Fast version of yearPH for big loops (PH has no daylight saving, so UTC+8 is exact). */
export function fastYearPH(unixSeconds: number): number {
  return new Date((unixSeconds + 8 * 3600) * 1000).getUTCFullYear();
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Date range like "Nov 3 – 11, 2013" or "Dec 28, 2011 – Jan 2, 2012". */
export function formatDateRangePH(start: number, end: number): string {
  const a = formatDatePH(start);
  const b = formatDatePH(end);
  if (a === b) return a;
  const ya = yearPH(start);
  const yb = yearPH(end);
  if (ya === yb) {
    const short = new Intl.DateTimeFormat("en-PH", { timeZone: PH_TZ, month: "short", day: "numeric" });
    return `${short.format(new Date(start * 1000))} – ${b}`;
  }
  return `${a} – ${b}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Money in words: $2.2 billion, ₱97.8 million, $450 thousand. */
export function formatMoney(amount: number, symbol: string): string {
  const units: [number, string][] = [
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ];
  for (const [size, word] of units) {
    if (amount >= size) {
      const v = amount / size;
      const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
      return `${symbol}${Number(v.toFixed(digits)).toLocaleString("en-US")} ${word}`;
    }
  }
  return `${symbol}${formatNumber(Math.round(amount))}`;
}

/** USD as Wikipedia lists it: $2.2 billion, $97.8 million, $450 thousand. */
export const formatUsd = (amount: number) => formatMoney(amount, "$");

/** "₱95480000000" (as listed) -> "₱95.48 billion"; anything else is returned as-is. */
export function formatPhpListed(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.replace(/,/g, "").match(/^₱\s*(\d+(?:\.\d+)?)$/);
  return m ? formatMoney(Number(m[1]), "₱") : raw;
}

export function formatMag(mag: number): string {
  return `M${mag.toFixed(1)}`;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
