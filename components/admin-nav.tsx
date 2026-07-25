import { signOutAction } from "@/app/actions";
import { NotifBell } from "@/components/notif-bell";
import { NavBar } from "@/components/nav-bar";

const LINKS = [
  { href: "/admin/trainers", label: "Vetting" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/evaluations", label: "Evaluations" },
  { href: "/admin/cashouts", label: "Cash-outs" },
  { href: "/admin/audit", label: "Audit" },
];

export function AdminNav() {
  return (
    <NavBar
      brand={
        <a href="/admin" className="flex items-center gap-2 text-espresso font-display text-lg font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          DogTrainerGH <span className="text-gold text-xs align-top">admin</span>
        </a>
      }
      links={LINKS}
      right={<NotifBell />}
      extra={
        <form action={signOutAction}>
          <button type="submit" className="text-gold font-semibold hover:underline">Sign out</button>
        </form>
      }
    />
  );
}
