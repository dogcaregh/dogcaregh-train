import { redirect } from "next/navigation";
import { TrainerNav } from "@/components/trainer-nav";
import { getMyTrainerProfile, getMyTrainerBookings } from "@/lib/trainer-data";
import { markSessionComplete, scheduleSession } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

// Ghana is UTC+0, so slicing/formatting the UTC ISO matches local time.
const inputVal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

type Session = { id: string; status: string; release_amount: number; scheduled_at: string | null };

export default async function TrainerBookingsPage() {
  const profile = await getMyTrainerProfile();
  if (!profile) redirect("/trainer/profile");
  const bookings = await getMyTrainerBookings();

  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Clients</h1>
        <p className="mt-1 text-sm text-muted">
          Schedule each session and mark it complete as you deliver it — completing releases that session&apos;s payout.
        </p>

        {bookings.length === 0 ? (
          <p className="mt-8 text-muted">No booked programs yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((b) => {
              const sessions = (b.trainer_sessions ?? []) as Session[];
              const done = sessions.filter((s) => s.status === "completed").length;
              const upcoming = sessions
                .filter((s) => s.status !== "completed" && s.scheduled_at && new Date(s.scheduled_at) >= new Date())
                .sort((a, z) => new Date(a.scheduled_at!).getTime() - new Date(z.scheduled_at!).getTime())[0];
              return (
                <div key={b.id} className="rounded-2xl bg-white border border-hairline p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg text-espresso">{b.ownerName}</h2>
                    <span className="text-sm text-espresso font-semibold">{cedis(Number(b.gross_amount))}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted capitalize">
                    {b.status.replace(/_/g, " ")} · {done}/{b.sessions_total} sessions complete
                    {upcoming && <span className="text-walnut"> · next {fmt(upcoming.scheduled_at!)}</span>}
                  </p>

                  <div className="mt-3 grid gap-2">
                    {sessions.map((s, i) => (
                      <div key={s.id} className="rounded-lg border border-hairline px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-walnut">
                            Session {i + 1}
                            <span className="text-xs text-muted"> · {cedis(Number(s.release_amount))}</span>
                            {s.scheduled_at && <span className="text-xs text-espresso"> · 🗓 {fmt(s.scheduled_at)}</span>}
                          </span>
                          {s.status === "completed" ? (
                            <span className="text-xs text-gold font-semibold">✓ Complete</span>
                          ) : (
                            <form action={markSessionComplete}>
                              <input type="hidden" name="session_id" value={s.id} />
                              <button className="rounded-full bg-walnut text-ivory text-xs font-semibold px-3 py-1 hover:bg-mahogany transition-colors">
                                Mark complete
                              </button>
                            </form>
                          )}
                        </div>
                        {s.status !== "completed" && (
                          <form action={scheduleSession} className="mt-2 flex items-center gap-2">
                            <input type="hidden" name="session_id" value={s.id} />
                            <input type="datetime-local" name="scheduled_at" defaultValue={inputVal(s.scheduled_at)}
                              className="rounded-lg border border-hairline bg-ivory px-2 py-1 text-xs text-espresso outline-none focus:border-gold" />
                            <button className="rounded-full border border-hairline text-walnut text-xs font-semibold px-3 py-1 hover:border-gold transition-colors">
                              {s.scheduled_at ? "Reschedule" : "Schedule"}
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
