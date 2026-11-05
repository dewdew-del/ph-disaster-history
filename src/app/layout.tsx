import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Public_Sans } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileTabBar from "@/components/nav/MobileTabBar";

// Self-hosted at build time by next/font (no request to Google from the visitor's browser).
const display = Instrument_Serif({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-instrument-serif" });
const sans = Public_Sans({ subsets: ["latin"], display: "swap", variable: "--font-public-sans" });

export const metadata: Metadata = {
  title: {
    default: "PH Disaster History: Philippine earthquakes and typhoons",
    template: "%s | PH Disaster History",
  },
  description:
    "Where strong earthquakes hit the Philippines most often, and the history of every typhoon that entered the PAR since 1945.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f6f7",
};

// Light by default; dark only when the visitor picked it. Runs before paint so the page doesn't flash.
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <MobileTabBar />
      </body>
    </html>
  );
}
