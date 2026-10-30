"use client";

import { useRouter } from "next/navigation";

/** "Change province" picker on a province page. */
export default function ProvinceSwitch({ current, provinces }: { current: string; provinces: { slug: string; name: string }[] }) {
  const router = useRouter();
  return (
    <label className="relative flex h-10 items-center rounded-full border border-control pl-4 pr-9 text-sm hover:bg-surface">
      Change province
      <span aria-hidden className="pointer-events-none absolute right-3.5">
        ▾
      </span>
      <select
        aria-label="Change province"
        value={current}
        onChange={(e) => router.push(`/lugar/${e.target.value}`)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {provinces.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
