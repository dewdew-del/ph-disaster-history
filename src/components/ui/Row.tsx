import type { ReactNode } from "react";

/** One section of a detail page as a flat tile: title on the left (on top on phones), content on the right. */
export default function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-md bg-surface p-5 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10 md:p-7">
      <h2 className="text-[1.75rem] leading-tight">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Up to four big numbers as tiles (two columns on phones). */
export function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {items.map(([value, label]) => (
        <div key={label} className="flex min-h-32 flex-col justify-between gap-4 rounded-md bg-surface p-5 md:p-6">
          <dd className="num text-[2rem] md:text-[2.5rem]">{value}</dd>
          <dt className="text-sm text-muted">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
