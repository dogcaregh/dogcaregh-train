import { OwnerNav } from "@/components/owner-nav";
import { SubmitButton } from "@/components/submit-button";
import { listMyRecommendations } from "@/lib/owner-data";
import { acceptRecommendation } from "@/app/actions";
import { cedis, programTotal, totalSessions, multiDogTotal } from "@/lib/pricing";

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
              const sessions = totalSessions(r.sessions_per_week, r.weeks);
              const perDogGross = Math.round(r.price * sessions * 100) / 100; // one dog, before program discount
              const perDog = programTotal(r.price, r.sessions_per_week, r.weeks, r.discount); // one dog, after program discount
              const programDisc = Math.round((perDogGross - perDog) * 100) / 100;
              const total = multiDogTotal(perDog, r.dogCount, r.multiDogDiscount); // what will actually be charged
              const multiDog = r.dogCount > 1;
              const multiDiscApplies = multiDog && r.multiDogDiscount > 0;
              const multiDiscAmt = multiDiscApplies ? Math.round((perDog * r.dogCount - total) * 100) / 100 : 0;
              const done = r.status !== "sent";
              const details = r.description || r.note;
              const dogsLabel = r.dogNames.length ? r.dogNames.join(", ") : null;

              return (
                <div key={r.id} className="rounded-2xl bg-white border border-hairline p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-gold bg-cream border border-hairline rounded-full px-2 py-0.5">
                      {r.is_custom ? "Custom plan" : "Recommended"}
                    </span>
                    <span className="text-xs text-muted">
                      from{" "}
                      <a href={`/trainers/${r.trainer_id}`} className="text-gold font-semibold hover:underline">
                        {r.trainerName}
                      </a>
                    </span>
                  </div>

                  <h2 className="mt-2 text-xl text-espresso">{r.name ?? "Recommended program"}</h2>
                  <div className="mt-1 text-xs text-muted">
                    {dogsLabel && <span>For {dogsLabel} · </span>}
                    {r.sessions_per_week}×/week · {r.weeks} weeks · {sessions} sessions{multiDog ? ` · ${r.dogCount} dogs` : ""}
                  </div>

                  {details && (
                    <div className="mt-3 rounded-lg bg-ivory border border-hairline p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">What&apos;s included</p>
                      <p className="mt-1 text-sm text-walnut whitespace-pre-line">{details}</p>
                    </div>
                  )}

                  <div className="mt-3 rounded-lg bg-cream/60 border border-hairline p-3 text-sm">
                    <Row label={`${cedis(r.price)}/session × ${sessions} sessions${multiDog ? " (per dog)" : ""}`} value={cedis(perDogGross)} />
                    {r.discount > 0 && <Row label={`Discount (${r.discount}%)`} value={`- ${cedis(programDisc)}`} gold />}
                    {multiDog && <Row label={`Per dog × ${r.dogCount} dogs`} value={cedis(Math.round(perDog * r.dogCount * 100) / 100)} />}
                    {multiDiscApplies && <Row label={`Multi-dog discount (${r.multiDogDiscount}%)`} value={`- ${cedis(multiDiscAmt)}`} gold />}
                    <div className="mt-1 pt-1 border-t border-hairline flex items-center justify-between">
                      <span className="font-semibold text-espresso">Total</span>
                      <span className="font-semibold text-espresso">{cedis(total)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <a href={`/trainers/${r.trainer_id}`} className="text-xs text-gold font-semibold hover:underline">
                      View trainer profile →
                    </a>
                    {done ? (
                      <span className="text-xs text-muted capitalize">{r.status}</span>
                    ) : (
                      <form action={acceptRecommendation}>
                        <input type="hidden" name="recommendation_id" value={r.id} />
                        <SubmitButton
                          className="rounded-full bg-walnut text-ivory text-sm font-semibold px-5 py-2 hover:bg-mahogany transition-colors disabled:opacity-60"
                          pendingText="Booking…"
                        >
                          Accept &amp; book
                        </SubmitButton>
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

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={gold ? "text-gold font-semibold" : "text-walnut"}>{value}</span>
    </div>
  );
}
