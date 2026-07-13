import { getServerUser } from "@/lib/owner-data";
import { signOutAction } from "@/app/actions";

// Plain <a> (full navigation) for auth-gated routes; sign-out is a POST.
export async function TrainerNav() {
  const user = await getServerUser();
  return (
    <header className="border-b border-hairline bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
        <a href="/trainer" className="text-espresso font-display text-lg font-semibold">
          DogTrainerGH <span className="text-gold text-xs align-top">trainer</span>
        </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="/trainer/leads" className="text-walnut hover:text-espresso">Leads</a>
          <a href="/trainer/programs" className="text-walnut hover:text-espresso">Programs</a>
          <a href="/trainer/bookings" className="text-walnut hover:text-espresso">Clients</a>
          <a href="/trainer/earnings" className="text-walnut hover:text-espresso">Earnings</a>
          <a href="/trainer/profile" className="text-walnut hover:text-espresso">Profile</a>
          {user && <span className="hidden sm:inline text-xs text-muted">{user.email}</span>}
          <form action={signOutAction}>
            <button type="submit" className="text-gold font-semibold hover:underline">Sign out</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
