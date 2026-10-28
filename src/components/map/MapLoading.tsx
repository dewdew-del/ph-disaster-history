export default function MapLoading({ label = "Loading map…" }: { label?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-foreground/5 text-sm text-muted" role="status">
      {label}
    </div>
  );
}
