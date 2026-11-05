import type { ReactNode } from "react";

/** One section of a detail page: serif title on the left (on top on phones), content on the right, hairline above. */
export default function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border py-8 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10">
      <h2 className="text-[1.75rem] leading-tight">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Up to four big numbers in a row between hairlines (two columns on phones). */
export function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-border md:grid-cols-4">
      {items.map(([value, label], i) => (
        <div
          key={label}
          className={`py-5 ${i % 2 ? "border-l border-border pl-5" : "pr-5"} ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${
            i === 2 ? "md:border-l md:pl-5" : ""
          }`}
        >
          <dd className="num text-[2rem] md:text-[2.5rem]">{value}</dd>
          <dt className="mt-1.5 text-sm text-muted">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
