// Small outline icons used in the navigation and search.
type Props = { name: "quake" | "storm" | "pin" | "book" | "search"; size?: number };

export default function Icon({ name, size = 22 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "quake":
      return (
        <svg {...common}>
          <path d="M2 12h4l2-6 3 12 3-9 2 3h6" />
        </svg>
      );
    case "storm":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5M12 19.5A7.5 7.5 0 0 1 4.5 12M18 6c-2-2-6-3-9-1M6 18c2 2 6 3 9 1" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z" />
          <path d="M9 9h6M9 13h6" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
  }
}

/** The site mark: an epicentre / storm eye in the accent colour. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden className="text-accent">
      <circle cx="14" cy="14" r="3.5" fill="currentColor" />
      <circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    </svg>
  );
}
