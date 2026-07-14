import { signOutAction } from "@/app/actions";
import { NotifBell } from "@/components/notif-bell";

export function AdminNav() {
  return (
    <header className="border-b border-hairline bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
        <a href="/admin" className="text-espresso font-display text-lg font-semibold">
          DogTrainerGH <span className="text-gold text-xs align-top">admin</span>
        </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="/admin/trainers" className="text-walnut hover:text-espresso">Vetting</a>
          <a href="/admin/users" className="text-walnut hover:text-espresso">Users</a>
          <a href="/admin/bookings" className="text-walnut hover:text-espresso">Bookings</a>
          <a href="/admin/cashouts" className="text-walnut hover:text-espresso">Cash-outs</a>
          <NotifBell />
          <form action={signOutAction}>
            <button type="submit" className="text-gold font-semibold hover:underline">Sign out</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
