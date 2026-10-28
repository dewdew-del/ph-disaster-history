import Link from "next/link";
import PhMapPreview from "@/components/map/PhMapPreview";

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">PH Disaster History</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Where strong earthquakes hit the Philippines most often, and the history of the typhoons that entered the PAR.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/linog" className="rounded-xl border border-border bg-card p-5 hover:border-accent">
          <h2 className="text-xl font-semibold">Linog Map</h2>
          <p className="mt-1 text-sm text-muted">Earthquakes M4.5+ since 1900 (USGS).</p>
        </Link>
        <Link href="/bagyo" className="rounded-xl border border-border bg-card p-5 hover:border-accent">
          <h2 className="text-xl font-semibold">Bagyo Archive</h2>
          <p className="mt-1 text-sm text-muted">Typhoons that entered the PAR since 1945 (IBTrACS).</p>
        </Link>
      </div>

      <div className="mt-6 h-[420px] overflow-hidden rounded-xl border border-border">
        <PhMapPreview />
      </div>
    </div>
  );
}
