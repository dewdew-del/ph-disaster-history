// Site sections, shared by the desktop header and the phone tab bar.
export type NavItem = { href: string; label: string; english?: string; tab: string; icon: "quake" | "storm" | "pin" | "book" };

export const NAV: NavItem[] = [
  { href: "/linog", label: "Linog", english: "Earthquakes", tab: "Quakes", icon: "quake" },
  { href: "/bagyo", label: "Bagyo", english: "Typhoons", tab: "Typhoons", icon: "storm" },
  { href: "/lugar", label: "My Province", tab: "My Province", icon: "pin" },
  { href: "/sources", label: "Sources", tab: "Sources", icon: "book" },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
