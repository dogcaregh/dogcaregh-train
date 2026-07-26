import { redirect } from "next/navigation";
import { TrainerNav } from "@/components/trainer-nav";
import { SubmitButton } from "@/components/submit-button";
import { getMyTrainerProfile, getMyLeads, getMyPrograms, type Lead } from "@/lib/trainer-data";
import { scheduleEvaluation, sendRecommendation } from "@/app/actions";
import { RecommendationBuilder } from "@/components/recommendation-builder";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const fmtDT = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

type Program = Awaited<ReturnType<typeof getMyPrograms>>[number];

export default async function LeadsPage({ searchParams }: { searchParams: { sent?: string } }) {
  const profile = await getMyTrainerProfile();
  if (!profile) redirect("/trainer/profile");
  const [leads, programs] = await Promise.all([getMyLeads(), getMyPrograms()]);

  const active = leads.filter((l) => !l.hasRecommendation);
  const sent = leads.filter((l) => l.hasRecommendation);

  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Leads</h1>
        <p className="mt-1 text-sm text-muted">
          Paid evaluation requests. Call the owner to confirm the location, run the evaluation, then send a recommendation.
        </p>
        {active.length > 0 && (
          <p className="mt-2 text-sm text-walnut">{active.length} lead{active.length > 1 ? "s" : ""} to respond to</p>
        )}

        {searchParams.sent && (
          <div className="mt-4 rounded-xl bg-[rgba(185,138,50,0.10)] border border-gold/40 p-4 text-sm text-walnut">
            ✓ Recommendation sent — it&apos;s now in the owner&apos;s inbox to accept.
          </div>
        )}

        {leads.length === 0 ? (
          <p className="mt-8 text-muted">No evaluation requests yet.</p>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              {active.map((l) => <LeadCard key={l.id} l={l} programs={programs} />)}
            </div>
            {active.length === 0 && <p className="mt-6 text-sm text-muted">All caught up — no leads waiting on you.</p>}

            {sent.length > 0 && (
              <details className="mt-8">
                <summary className="text-sm font-semibold text-gold cursor-pointer list-none">Recommendation sent ({sent.length}) ▾</summary>
                <div className="mt-3 space-y-2">
                  {sent.map((l) => (
                    <div key={l.id} className="rounded-xl border border-hairline bg-white/70 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-espresso font-semibold">{l.ownerName}</p>
                        <a href={`/trainer/messages/${l.owner_id}`} className="text-xs text-gold font-semibold hover:underline">💬 Message</a>
                      </div>
                      <p className="text-xs text-muted">
                        {l.dogs.map((d) => d.name).join(", ") || "—"} · ✓ recommendation sent
                        {l.scheduled_at ? ` · evaluated ${fmtDT(l.scheduled_at)}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </main>
    </>
  );
}

function nextStep(l: Lead): string {
  if (!l.scheduled_at) return "Next: call the owner to confirm their location, then propose a time.";
  if (!l.scheduleConfirmed) return "Next: waiting for the owner to confirm your proposed time.";
  return "Next: run the evaluation, then send a recommendation below.";
}

function LeadCard({ l, programs }: { l: Lead; programs: Program[] }) {
  return (
    <div className="rounded-2xl bg-white border border-hairline p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-espresso">{l.ownerName}</h2>
        <div className="flex items-center gap-3">
          <a href={`/trainer/messages/${l.owner_id}`} className="text-xs text-gold font-semibold hover:underline">💬 Message</a>
          <span className="text-[10px] uppercase tracking-wide font-semibold text-walnut bg-cream border border-hairline rounded-full px-2 py-0.5 capitalize">
            {l.status}
          </span>
        </div>
      </div>

      {/* Dogs */}
      {l.dogs.length > 0 ? (
        <div className="mt-2 grid gap-1">
          {l.dogs.map((d, i) => {
            const detail = [d.breed, d.size, d.age != null ? `${d.age}mo` : null, d.temperament, d.vaccination_status ? "✓ vaccinated" : null].filter(Boolean).join(" · ");
            return (
              <p key={i} className="text-sm text-walnut">
                🐕 <strong className="text-espresso">{d.name}</strong>
                {detail && <span className="text-xs text-muted"> — {detail}</span>}
              </p>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">No dog details.</p>
      )}

      {/* Intake */}
      <p className="mt-1 text-xs text-muted">
        {[l.goal, l.neighbourhood, l.schedulePref].filter(Boolean).join(" · ") || "No intake details"}
        {l.budget != null && ` · budget ${cedis(l.budget)}/session`}
      </p>
      <p className="mt-1 text-xs text-muted">Evaluation fee {cedis(l.fee)}{l.program_id ? " · for a specific program" : " · general"}</p>

      {l.contactPhone && (
        <p className="mt-1 text-sm text-walnut">
          📞 Call to confirm location:{" "}
          <a href={`tel:${l.contactPhone}`} className="font-semibold text-espresso hover:underline">{l.contactPhone}</a>
        </p>
      )}

      <p className="mt-3 text-xs text-gold font-semibold">{nextStep(l)}</p>

      <div className="mt-3 space-y-4">
        {l.scheduled_at && (
          <div className="rounded-lg border border-hairline bg-cream/50 p-3 text-xs text-walnut">
            Proposed: <strong className="text-espresso">{fmtDT(l.scheduled_at)}</strong> ·{" "}
            {l.scheduleConfirmed
              ? <span className="text-green-700 font-semibold">owner confirmed ✓</span>
              : <span className="text-gold font-semibold">awaiting owner confirmation</span>}
          </div>
        )}
        {l.status !== "completed" && (
          <form action={scheduleEvaluation} className="flex items-end gap-2">
            <input type="hidden" name="evaluation_id" value={l.id} />
            <label className="flex-1">
              <span className="text-xs font-semibold text-walnut">{l.scheduled_at ? "Change proposed time" : "Propose an evaluation time"}</span>
              <input type="datetime-local" name="scheduled_at"
                className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
            </label>
            <SubmitButton pendingText="…" className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors disabled:opacity-60">
              {l.scheduled_at ? "Update" : "Propose"}
            </SubmitButton>
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
                  <SubmitButton pendingText="Sending…" className="w-full text-left rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm text-walnut hover:border-gold transition-colors disabled:opacity-60">
                    Recommend <strong className="text-espresso">{p.name}</strong>
                  </SubmitButton>
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
    </div>
  );
}
