import { signOutAction } from "@/app/actions";
import { NotifBell } from "@/components/notif-bell";
import { MsgLink } from "@/components/msg-link";
import { NavBar } from "@/components/nav-bar";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trainers", label: "Trainers" },
  { href: "/dogs", label: "My dogs" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/bookings", label: "My bookings" },
];

export function OwnerNav() {
  return (
    <NavBar
      brand={
        <a href="/trainers" className="flex items-center gap-2 text-espresso font-display text-lg font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          DogTrainerGH
        </a>
      }
      links={LINKS}
      right={<NotifBell />}
      extra={
        <>
          <MsgLink href="/messages" />
          <form action={signOutAction}>
            <button type="submit" className="text-gold font-semibold hover:underline">Sign out</button>
          </form>
        </>
      }
    />
  );
}
