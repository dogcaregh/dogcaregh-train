import { redirect } from "next/navigation";
import { TrainerNav } from "@/components/trainer-nav";
import { getMyTrainerProfile, getMyLeads, getMyPrograms } from "@/lib/trainer-data";
import { scheduleEvaluation, sendRecommendation } from "@/app/actions";
import { RecommendationBuilder } from "@/components/recommendation-builder";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: { sent?: string } }) {
  const profile = await getMyTrainerProfile();
  if (!profile) redirect("/trainer/profile");
  const [leads, programs] = await Promise.all([getMyLeads(), getMyPrograms()]);

  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Leads</h1>
        <p className="mt-1 text-sm text-muted">Evaluation requests. Run the evaluation, then send a recommendation.</p>

        {searchParams.sent && (
          <div className="mt-4 rounded-xl bg-[rgba(185,138,50,0.10)] border border-gold/40 p-4 text-sm text-walnut">
            ✓ Recommendation sent — it&apos;s now in the owner&apos;s inbox to accept.
          </div>
        )}

        {leads.length === 0 ? (
          <p className="mt-8 text-muted">No evaluation requests yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {leads.map((l) => (
              <div key={l.id} className="rounded-2xl bg-white border border-hairline p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg text-espresso">{l.ownerName}</h2>
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-walnut bg-cream border border-hairline rounded-full px-2 py-0.5 capitalize">
                    {l.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {[l.dogName && `Dog: ${l.dogName}`, l.dogBreed, l.goal, l.neighbourhood].filter(Boolean).join(" · ") || "No intake details"}
                  {l.budget != null && ` · budget ${cedis(l.budget)}/session`}
                </p>
                <p className="mt-1 text-xs text-muted">Evaluation fee {cedis(l.fee)}{l.program_id ? " · for a specific program" : " · general"}</p>

                {l.hasRecommendation ? (
                  <p className="mt-3 text-sm text-walnut font-semibold">✓ Recommendation sent</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {l.status !== "scheduled" && l.status !== "completed" && (
                      <form action={scheduleEvaluation} className="flex items-end gap-2">
                        <input type="hidden" name="evaluation_id" value={l.id} />
                        <label className="flex-1">
                          <span className="text-xs font-semibold text-walnut">Schedule the evaluation</span>
                          <input type="datetime-local" name="scheduled_at"
                            className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
                        </label>
                        <button className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors">Schedule</button>
                      </form>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-walnut">Recommend a standard package</p>
                      {programs.length === 0 ? (
                        <p className="mt-1 text-xs text-muted">No programs yet — <a href="/trainer/programs" className="text-gold hover:underline">add one</a>.</p>
                      ) : (
                        <div className="mt-2 grid gap-2">
                          {programs.map((p) => (
                            <form key={p.id} action={sendRecommendation}>
                              <input type="hidden" name="mode" value="standard" />
                              <input type="hidden" name="evaluation_id" value={l.id} />
                              <input type="hidden" name="program_id" value={p.id} />
                              <button className="w-full text-left rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm text-walnut hover:border-gold transition-colors">
                                Recommend <strong className="text-espresso">{p.name}</strong>
                              </button>
                            </form>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-walnut">…or build a custom plan</p>
                      <RecommendationBuilder evaluationId={l.id} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
