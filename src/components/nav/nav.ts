// Site sections. The header shows the first three; the phone tab bar adds Home; Sources lives in the footer.
export type NavItem = { href: string; label: string; english?: string; tab: string; icon: "home" | "quake" | "storm" | "pin" | "book" };

export const NAV: NavItem[] = [
  { href: "/linog", label: "Linog", english: "Earthquakes", tab: "Quakes", icon: "quake" },
  { href: "/bagyo", label: "Bagyo", english: "Typhoons", tab: "Typhoons", icon: "storm" },
  { href: "/lugar", label: "My Province", tab: "My Province", icon: "pin" },
];

export const TABS: NavItem[] = [{ href: "/", label: "Home", tab: "Home", icon: "home" }, ...NAV];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
