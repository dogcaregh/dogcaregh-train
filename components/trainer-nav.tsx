import { signOutAction } from "@/app/actions";
import { NotifBell } from "@/components/notif-bell";
import { MsgLink } from "@/components/msg-link";
import { NavBar } from "@/components/nav-bar";

const LINKS = [
  { href: "/trainer/leads", label: "Leads" },
  { href: "/trainer/programs", label: "Programs" },
  { href: "/trainer/bookings", label: "Clients" },
  { href: "/trainer/earnings", label: "Earnings" },
  { href: "/trainer/profile", label: "Profile" },
];

export function TrainerNav() {
  return (
    <NavBar
      brand={
        <a href="/trainer" className="flex items-center gap-2 text-espresso font-display text-lg font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          DogTrainerGH <span className="text-gold text-xs align-top">trainer</span>
        </a>
      }
      links={LINKS}
      right={<NotifBell />}
      extra={
        <>
          <MsgLink href="/trainer/messages" />
          <form action={signOutAction}>
            <button type="submit" className="text-gold font-semibold hover:underline">Sign out</button>
          </form>
        </>
      }
    />
  );
}
