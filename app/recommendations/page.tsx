import { OwnerNav } from "@/components/owner-nav";
import { listMyRecommendations, relName } from "@/lib/owner-data";
import { acceptRecommendation } from "@/app/actions";
import { cedis, programTotal, totalSessions } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const recs = await listMyRecommendations();

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">Recommended for you</p>
        <h1 className="mt-1 text-3xl text-espresso">Your recommendations</h1>

        {recs.length === 0 ? (
          <div className="mt-6 rounded-xl bg-cream border border-hairline p-5 text-sm text-walnut">
            No recommendations yet. After a trainer evaluates your dog, their recommended
            program lands here as a card you can accept.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {recs.map((r) => {
              const total = programTotal(Number(r.price), r.sessions_per_week, r.weeks, Number(r.discount));
              const done = r.status !== "sent";
              return (
                <div key={r.id} className="rounded-2xl bg-white border border-hairline p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-gold bg-cream border border-hairline rounded-full px-2 py-0.5">
                      {r.is_custom ? "Custom plan" : "Recommended"}
                    </span>
                    <span className="text-xs text-muted">from {relName(r.trainer_profiles)}</span>
                  </div>
                  <h2 className="mt-2 text-xl text-espresso">{r.name ?? "Recommended program"}</h2>
                  <div className="mt-1 text-xs text-muted">
                    {r.sessions_per_week}×/week · {r.weeks} weeks · {totalSessions(r.sessions_per_week, r.weeks)} sessions
                    {Number(r.discount) > 0 && <span className="text-gold font-semibold"> · {r.discount}% off</span>}
                  </div>
                  {r.note && <p className="mt-2 text-sm text-walnut">{r.note}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-espresso font-semibold">{cedis(total)}</span>
                    {done ? (
                      <span className="text-xs text-muted capitalize">{r.status}</span>
                    ) : (
                      <form action={acceptRecommendation}>
                        <input type="hidden" name="recommendation_id" value={r.id} />
                        <button className="rounded-full bg-walnut text-ivory text-sm font-semibold px-5 py-2 hover:bg-mahogany transition-colors">
                          Accept &amp; book
                        </button>
                      </form>
                    )}
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
