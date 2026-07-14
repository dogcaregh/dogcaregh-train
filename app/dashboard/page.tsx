import { OwnerNav } from "@/components/owner-nav";
import { getServerUser } from "@/lib/owner-data";
import { listMyRecommendations, listMyBookings, listMyEvaluations, getMyDogs, relName } from "@/lib/owner-data";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function OwnerDashboard() {
  const [user, recs, bookings, evals, dogs] = await Promise.all([
    getServerUser(),
    listMyRecommendations(),
    listMyBookings(),
    listMyEvaluations(),
    getMyDogs(),
  ]);
  const firstName = ((user?.user_metadata?.name as string) || user?.email || "there").split(" ")[0];

  const pendingRecs = recs.filter((r) => r.status === "sent");
  const active = bookings.filter((b) => !["closed", "cancelled"].includes(b.status));
  const scheduledEvals = evals.filter((e) => e.scheduled_at && new Date(e.scheduled_at as string) >= new Date());

  // next session across active bookings
  const nextSessions = active
    .flatMap((b) => ((b.trainer_sessions ?? []) as { status: string; scheduled_at: string | null }[])
      .filter((s) => s.status !== "completed" && s.scheduled_at && new Date(s.scheduled_at) >= new Date())
      .map((s) => ({ when: s.scheduled_at!, trainer: relName(b.trainer_profiles) })))
    .sort((a, z) => new Date(a.when).getTime() - new Date(z.when).getTime());

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-4xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Hi {firstName} 🐾</h1>
        <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening with your dog&apos;s training.</p>

        {/* Action needed */}
        {pendingRecs.length > 0 && (
          <a href="/recommendations" className="mt-6 block rounded-2xl border border-gold/50 bg-[rgba(185,138,50,0.08)] p-5 hover:border-gold transition-colors">
            <p className="text-sm font-semibold text-espresso">
              ✨ You have {pendingRecs.length} recommendation{pendingRecs.length > 1 ? "s" : ""} to review
            </p>
            <p className="mt-1 text-sm text-walnut">
              {pendingRecs.slice(0, 2).map((r) => r.name).filter(Boolean).join(", ") || "A trainer sent you a program."} — accept to book.
            </p>
            <p className="mt-2 text-xs text-gold font-semibold">Review →</p>
          </a>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Active programs" value={active.length} href="/bookings" />
          <Stat label="Your dogs" value={dogs.length} href="/dogs" />
          <Stat label="Upcoming sessions" value={nextSessions.length} href="/bookings" />
        </div>

        {/* Upcoming */}
        {(nextSessions.length > 0 || scheduledEvals.length > 0) && (
          <section className="mt-8">
            <h2 className="text-lg text-espresso">Upcoming</h2>
            <div className="mt-3 grid gap-2">
              {scheduledEvals.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl bg-white border border-hairline px-4 py-3 text-sm">
                  <span className="text-walnut">🔎 Evaluation · {relName(e.trainer_profiles)}</span>
                  <span className="text-espresso font-semibold">{fmt(e.scheduled_at as string)}</span>
                </div>
              ))}
              {nextSessions.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-white border border-hairline px-4 py-3 text-sm">
                  <span className="text-walnut">🗓 Session · {s.trainer}</span>
                  <span className="text-espresso font-semibold">{fmt(s.when)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active programs */}
        {active.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg text-espresso">Your programs</h2>
            <div className="mt-3 grid gap-3">
              {active.map((b) => {
                const sessions = (b.trainer_sessions ?? []) as { status: string }[];
                const done = sessions.filter((s) => s.status === "completed").length;
                return (
                  <a key={b.id} href="/bookings" className="block rounded-xl bg-white border border-hairline p-4 hover:border-gold transition-colors">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-espresso font-semibold">{relName(b.trainer_profiles)}</span>
                      <span className="text-muted">{done}/{b.sessions_total} sessions · {cedis(Number(b.gross_amount))}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-cream overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${b.sessions_total ? (done / b.sessions_total) * 100 : 0}%` }} />
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/trainers" className="rounded-full bg-espresso text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-mahogany transition-colors">Find a trainer →</a>
          {dogs.length === 0 && <a href="/dogs" className="rounded-full border border-hairline text-walnut text-sm font-semibold px-5 py-2.5 hover:border-gold transition-colors">Add your dog</a>}
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="block rounded-2xl bg-white border border-hairline p-5 hover:border-gold transition-colors">
      <p className="text-4xl font-display text-espresso">{value}</p>
      <p className="mt-1 text-sm text-walnut">{label}</p>
    </a>
  );
}
