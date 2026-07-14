import { OwnerNav } from "@/components/owner-nav";
import { listMyBookings, listMyEvaluations, relName } from "@/lib/owner-data";
import { submitReview } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const BOOKED_MSG: Record<string, string> = {
  eval: "Evaluation booked and paid.",
  program: "Program booked and paid.",
  recommendation: "Recommendation accepted and paid.",
};
const PAID_MSG: Record<string, string> = {
  "1": "Payment successful — you're all set.",
  failed: "Payment wasn't completed. You can try again from the trainer's page.",
  mismatch: "Payment amount didn't match — nothing was charged to your booking.",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { booked?: string; paid?: string; reviewed?: string };
}) {
  const [evals, bookings] = await Promise.all([listMyEvaluations(), listMyBookings()]);
  const banner = searchParams.reviewed
    ? "Thanks — your review is live on the trainer's profile."
    : searchParams.paid
      ? PAID_MSG[searchParams.paid]
      : searchParams.booked
        ? BOOKED_MSG[searchParams.booked]
        : null;
  const bannerBad = searchParams.paid === "failed" || searchParams.paid === "mismatch";

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl text-espresso">My bookings</h1>

        {banner && (
          <div className={`mt-4 rounded-xl border p-4 text-sm ${
            bannerBad
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-gold/40 bg-[rgba(185,138,50,0.10)] text-walnut"
          }`}>
            {bannerBad ? "" : "✓ "}{banner}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-lg text-espresso">Evaluations</h2>
          {evals.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No evaluations yet. <a href="/trainers" className="text-gold hover:underline">Find a trainer →</a>
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {evals.map((e) => (
                <div key={e.id} className="rounded-xl bg-white border border-hairline p-4 flex items-center justify-between">
                  <div>
                    <p className="text-espresso font-semibold">Evaluation · {relName(e.trainer_profiles)}</p>
                    <p className="text-xs text-muted">{e.program_id ? "For a specific program" : "General evaluation"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-espresso font-semibold">{cedis(Number(e.fee))}</p>
                    <StatusPill status={e.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg text-espresso">Programs</h2>
          {bookings.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No booked programs yet.</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {bookings.map((b) => {
                const sessions = (b.trainer_sessions ?? []) as { id: string; status: string; scheduled_at: string | null }[];
                const done = sessions.filter((s) => s.status === "completed").length;
                const reviewed = ((b.trainer_reviews ?? []) as { id: string }[]).length > 0;
                const next = sessions
                  .filter((s) => s.status !== "completed" && s.scheduled_at && new Date(s.scheduled_at) >= new Date())
                  .sort((a, z) => new Date(a.scheduled_at!).getTime() - new Date(z.scheduled_at!).getTime())[0];
                return (
                  <div key={b.id} className="rounded-xl bg-white border border-hairline p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-espresso font-semibold">{relName(b.trainer_profiles)}</p>
                      <StatusPill status={b.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted">
                        {done}/{b.sessions_total} sessions complete
                      </span>
                      <span className="text-espresso font-semibold">{cedis(Number(b.gross_amount))}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-cream overflow-hidden">
                      <div
                        className="h-full bg-gold"
                        style={{ width: `${b.sessions_total ? (done / b.sessions_total) * 100 : 0}%` }}
                      />
                    </div>
                    {next && (
                      <p className="mt-2 text-xs text-walnut">
                        🗓 Next session: <strong className="text-espresso">{new Date(next.scheduled_at!).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</strong>
                      </p>
                    )}

                    {b.status === "closed" && (
                      reviewed ? (
                        <p className="mt-3 text-xs text-gold font-semibold">✓ You reviewed this program</p>
                      ) : (
                        <form action={submitReview} className="mt-3 border-t border-hairline pt-3">
                          <input type="hidden" name="booking_id" value={b.id} />
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-walnut">Rate your trainer</label>
                            <select name="rating" defaultValue="5" className="rounded-lg border border-hairline bg-ivory px-2 py-1 text-sm text-espresso outline-none focus:border-gold">
                              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                            </select>
                          </div>
                          <input name="text" placeholder="How did it go? (optional)"
                            className="mt-2 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
                          <button className="mt-2 rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-1.5 hover:bg-mahogany transition-colors">
                            Submit review
                          </button>
                        </form>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-block text-[10px] uppercase tracking-wide font-semibold text-walnut bg-cream border border-hairline rounded-full px-2 py-0.5 capitalize">
      {status.replace(/_/g, " ")}
    </span>
  );
}
