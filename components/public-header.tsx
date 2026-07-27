/** Lightweight header for signed-out, public pages (profile + trainer list). */
export function PublicHeader() {
  return (
    <header className="border-b border-hairline bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-espresso font-display text-lg font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          DogTrainerGH
        </a>
        <a href="/login" className="text-sm text-gold font-semibold hover:underline">Log in</a>
      </div>
    </header>
  );
}
