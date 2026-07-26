// Route-level loading UI — streams as the fallback while any page loads (on
// full loads and navigations), so every page shows a branded loader.
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid h-24 w-24 place-items-center">
          <div className="absolute inset-0 rounded-full border-2 border-cream border-t-gold animate-spin" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="DogTrainerGH" className="h-14 w-14 object-contain" />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-muted">Loading…</p>
      </div>
    </div>
  );
}
