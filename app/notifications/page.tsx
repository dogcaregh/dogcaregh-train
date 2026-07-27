import { OwnerNav } from "@/components/owner-nav";
import { TrainerNav } from "@/components/trainer-nav";
import { NotifLink } from "@/components/notif-link";
import { EmptyState } from "@/components/empty-state";
import { listMyNotifications } from "@/lib/notify";
import { getServerUser } from "@/lib/owner-data";
import { markAllNotificationsRead } from "@/app/actions";

export const dynamic = "force-dynamic";

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function NotificationsPage() {
  const [user, items] = await Promise.all([getServerUser(), listMyNotifications()]);
  const trainerOrigin = user?.user_metadata?.role === "trainer";
  const hasUnread = items.some((n) => !n.read);

  return (
    <>
      {trainerOrigin ? <TrainerNav /> : <OwnerNav />}
      <main className="mx-auto max-w-2xl px-5 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl text-espresso">Notifications</h1>
          {hasUnread && (
            <form action={markAllNotificationsRead}>
              <button className="text-sm text-gold font-semibold hover:underline">Mark all read</button>
            </form>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState title="No notifications yet" body="Updates about your evaluations, bookings, and messages show up here." />
        ) : (
          <div className="mt-6 grid gap-2">
            {items.map((n) => (
              <NotifLink
                key={n.id}
                id={n.id}
                href={n.link || "/"}
                read={n.read}
                className={`block rounded-xl border p-4 transition-colors ${
                  n.read ? "border-hairline bg-white" : "border-gold/40 bg-[rgba(185,138,50,0.06)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-espresso">{n.message}</p>
                  {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                </div>
                <p className="mt-1 text-xs text-muted">{ago(n.created_at)}</p>
              </NotifLink>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
