import { redirect } from "next/navigation";
import { TrainerNav } from "@/components/trainer-nav";
import { getMyTrainerProfile, getMyTrainerBookings } from "@/lib/trainer-data";
import { markSessionComplete } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

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
          Booked programs. Mark each session complete as you deliver it — that releases the session&apos;s payout (escrow).
        </p>

        {bookings.length === 0 ? (
          <p className="mt-8 text-muted">No booked programs yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((b) => {
              const sessions = (b.trainer_sessions ?? []) as { id: string; status: string; release_amount: number }[];
              const done = sessions.filter((s) => s.status === "completed").length;
              const sorted = [...sessions].sort((a, z) => (a.status === "completed" ? -1 : 1) - (z.status === "completed" ? -1 : 1));
              return (
                <div key={b.id} className="rounded-2xl bg-white border border-hairline p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg text-espresso">{b.ownerName}</h2>
                    <span className="text-sm text-espresso font-semibold">{cedis(Number(b.gross_amount))}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted capitalize">
                    {b.status.replace(/_/g, " ")} · {done}/{b.sessions_total} sessions complete
                  </p>

                  <div className="mt-3 grid gap-1.5">
                    {sorted.map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2">
                        <span className="text-sm text-walnut">
                          Session {i + 1}
                          <span className="text-xs text-muted"> · {cedis(Number(s.release_amount))}</span>
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
