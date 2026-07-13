import Link from "next/link";
import { OwnerNav } from "@/components/owner-nav";
import { listMyBookings, listMyEvaluations, relName } from "@/lib/owner-data";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const BOOKED_MSG: Record<string, string> = {
  eval: "Evaluation requested — you'll be able to pay once the trainer confirms.",
  program: "Program booked. Payment will be collected in the next step.",
  recommendation: "Recommendation accepted and booked.",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { booked?: string };
}) {
  const [evals, bookings] = await Promise.all([listMyEvaluations(), listMyBookings()]);
  const banner = searchParams.booked ? BOOKED_MSG[searchParams.booked] : null;

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl text-espresso">My bookings</h1>

        {banner && (
          <div className="mt-4 rounded-xl bg-[rgba(185,138,50,0.10)] border border-gold/40 p-4 text-sm text-walnut">
            ✓ {banner}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-lg text-espresso">Evaluations</h2>
          {evals.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No evaluations yet. <Link href="/trainers" className="text-gold hover:underline">Find a trainer →</Link>
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
                const sessions = (b.trainer_sessions ?? []) as { id: string; status: string }[];
                const done = sessions.filter((s) => s.status === "completed").length;
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
