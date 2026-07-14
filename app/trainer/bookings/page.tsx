import { redirect } from "next/navigation";
import { TrainerNav } from "@/components/trainer-nav";
import { getMyTrainerProfile, getMyTrainerBookings } from "@/lib/trainer-data";
import { markSessionComplete, scheduleSession, autoScheduleSessions } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const WEEKDAYS = [
  { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" }, { v: 4, l: "Thu" },
  { v: 5, l: "Fri" }, { v: 6, l: "Sat" }, { v: 0, l: "Sun" },
];

// Ghana is UTC+0, so slicing/formatting the UTC ISO matches local time.
const inputVal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

type Session = { id: string; seq: number | null; status: string; release_amount: number; scheduled_at: string | null };

/** Fixed session order by seq (legacy rows without seq fall back to date/id). */
function bySeq(a: Session, z: Session): number {
  if (a.seq != null && z.seq != null) return a.seq - z.seq;
  if (a.seq != null) return -1;
  if (z.seq != null) return 1;
  return (a.scheduled_at ?? "").localeCompare(z.scheduled_at ?? "") || a.id.localeCompare(z.id);
}

export default async function TrainerBookingsPage() {
  const profile = await getMyTrainerProfile();
  if (!profile) redirect("/trainer/profile");
  const bookings = await getMyTrainerBookings();
  const today = new Date().toISOString().slice(0, 10);

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
              const sessions = ((b.trainer_sessions ?? []) as Session[]).slice().sort(bySeq);
              const done = sessions.filter((s) => s.status === "completed").length;
              const upcoming = sessions
                .filter((s) => s.status !== "completed" && s.scheduled_at && new Date(s.scheduled_at) >= new Date())
                .sort((a, z) => new Date(a.scheduled_at!).getTime() - new Date(z.scheduled_at!).getTime())[0];
              return (
                <div key={b.id} className="rounded-2xl bg-white border border-hairline p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg text-espresso">{b.ownerName}</h2>
                      <a href={`/trainer/messages/${b.owner_id}`} className="text-xs text-gold font-semibold hover:underline">💬 Message</a>
                    </div>
                    <span className="text-sm text-espresso font-semibold">{cedis(Number(b.gross_amount))}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted capitalize">
                    {b.status.replace(/_/g, " ")} · {done}/{b.sessions_total} sessions complete
                    {upcoming && <span className="text-walnut"> · next {fmt(upcoming.scheduled_at!)}</span>}
                  </p>

                  {done < b.sessions_total && (
                    <details className="mt-3 rounded-xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-3">
                      <summary className="text-sm font-semibold text-espresso cursor-pointer">⚡ Auto-schedule all {b.sessions_total} sessions</summary>
                      <form action={autoScheduleSessions} className="mt-3 space-y-3">
                        <input type="hidden" name="booking_id" value={b.id} />
                        <div>
                          <span className="text-xs font-semibold text-walnut">Training days</span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {WEEKDAYS.map((d) => (
                              <label key={d.v} className="cursor-pointer">
                                <input type="checkbox" name="days" value={d.v} className="peer sr-only" />
                                <span className="inline-block rounded-full border border-hairline bg-white px-3 py-1 text-xs text-walnut peer-checked:bg-walnut peer-checked:text-ivory peer-checked:border-walnut transition-colors">
                                  {d.l}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="block">
                            <span className="text-xs font-semibold text-walnut">Time</span>
                            <input type="time" name="time" defaultValue="09:00"
                              className="mt-1 block rounded-lg border border-hairline bg-white px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold" />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-walnut">Start date</span>
                            <input type="date" name="start_date" defaultValue={today} min={today}
                              className="mt-1 block rounded-lg border border-hairline bg-white px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold" />
                          </label>
                          <button className="rounded-full bg-mahogany text-ivory text-xs font-semibold px-4 py-2 hover:bg-espresso transition-colors">
                            Schedule all
                          </button>
                        </div>
                        <p className="text-[11px] text-muted">
                          Fills every session on your chosen weekdays, in order, from the start date. You can fine-tune any single session below.
                        </p>
                      </form>
                    </details>
                  )}

                  <div className="mt-3 grid gap-2">
                    {sessions.map((s, i) => (
                      <div key={s.id} className="rounded-lg border border-hairline px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-walnut">
                            Session {s.seq ?? i + 1}
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
