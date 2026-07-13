import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function OwnerNav() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-hairline bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
        <Link href="/trainers" className="text-espresso font-display text-lg font-semibold">
          DogTrainerGH
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/trainers" className="text-walnut hover:text-espresso">Trainers</Link>
          <Link href="/recommendations" className="text-walnut hover:text-espresso">Recommendations</Link>
          <Link href="/bookings" className="text-walnut hover:text-espresso">My bookings</Link>
          {user && (
            <span className="hidden sm:inline text-xs text-muted">{user.email}</span>
          )}
          <Link href="/logout" className="text-gold font-semibold hover:underline">Sign out</Link>
        </nav>
      </div>
    </header>
  );
}
