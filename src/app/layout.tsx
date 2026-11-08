import type { Metadata, Viewport } from "next";
import { Stack_Sans_Headline, Stack_Sans_Text } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileTabBar from "@/components/nav/MobileTabBar";

// Self-hosted at build time by next/font (no request to Google from the visitor's browser).
const display = Stack_Sans_Headline({ weight: ["300", "500"], subsets: ["latin"], display: "swap", variable: "--font-stack-headline" });
const sans = Stack_Sans_Text({ weight: ["400", "500"], subsets: ["latin"], display: "swap", variable: "--font-stack-text" });

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
  themeColor: "#08111d",
};

// Dark by default (the html tag ships with "dark"); light only when the visitor picked it. Runs before paint so the page doesn't flash.
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.remove('dark');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark h-full antialiased ${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <a href="#main" className="sr-only z-[2000] rounded-md bg-foreground px-4 py-3 font-semibold text-background focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1 scroll-mt-14">{children}</main>
        <SiteFooter />
        <MobileTabBar />
      </body>
    </html>
  );
}
