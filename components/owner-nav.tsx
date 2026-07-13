import { createServerSupabaseClient } from "@/lib/supabase-server";

// Plain <a> anchors (full navigation) rather than next/link on purpose: every
// route here is auth-gated and redirects when logged out, and Next's client
// router can replay a cached redirect after login ("nothing happens" on click).
// Full navigations always resolve fresh against the current session.
export async function OwnerNav() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-hairline bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
        <a href="/trainers" className="text-espresso font-display text-lg font-semibold">
          DogTrainerGH
        </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="/trainers" className="text-walnut hover:text-espresso">Trainers</a>
          <a href="/recommendations" className="text-walnut hover:text-espresso">Recommendations</a>
          <a href="/bookings" className="text-walnut hover:text-espresso">My bookings</a>
          {user && (
            <span className="hidden sm:inline text-xs text-muted">{user.email}</span>
          )}
          <a href="/logout" className="text-gold font-semibold hover:underline">Sign out</a>
        </nav>
      </div>
    </header>
  );
}
