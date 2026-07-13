import { notFound } from "next/navigation";
import { OwnerNav } from "@/components/owner-nav";
import { getTrainer } from "@/lib/owner-data";
import { bookEvaluation, rebookProgram } from "@/app/actions";
import { cedis, programTotal, totalSessions } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function TrainerPage({ params }: { params: { id: string } }) {
  const t = await getTrainer(params.id);
  if (!t) notFound();

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <a href="/trainers" className="text-sm text-gold hover:underline">← All trainers</a>

        <h1 className="mt-3 text-3xl text-espresso">{t.name}</h1>
        <p className="mt-1 text-sm text-muted">{t.neighbourhoods.join(", ")}</p>
        {t.bio && <p className="mt-3 text-walnut">{t.bio}</p>}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {t.specialties.map((s) => (
            <span key={s} className="text-xs text-walnut bg-ivory border border-hairline rounded-full px-2 py-0.5">{s}</span>
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Meta label="Breeds" value={t.breeds.join(", ")} />
          <Meta label="Experience" value={t.years_experience ? `${t.years_experience} yrs` : "—"} />
          <Meta label="Methods" value={t.methods ?? "—"} />
          <Meta label="Credentials" value={t.credentials ?? "—"} />
        </dl>

        {/* Evaluation-first: the primary path for a new program */}
        <section className="mt-8 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
          <h2 className="text-xl text-espresso">Start with an evaluation</h2>
          <p className="mt-1 text-sm text-walnut">
            Every new program begins with a paid evaluation. After meeting your dog, {t.name.replace(/^DEMO · /, "")} sends a recommended program you can accept.
          </p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Evaluation fee</span>
            <span className="text-espresso font-semibold">{cedis(t.eval_fee)}</span>
          </div>

          <div className="mt-4 grid gap-2">
            {t.programs.map((p) => (
              <form key={p.id} action={bookEvaluation}>
                <input type="hidden" name="trainer_id" value={t.id} />
                <input type="hidden" name="program_id" value={p.id} />
                <button className="w-full text-left rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm text-walnut hover:border-gold transition-colors">
                  Evaluate for <strong className="text-espresso">{p.name}</strong>
                </button>
              </form>
            ))}
            <form action={bookEvaluation}>
              <input type="hidden" name="trainer_id" value={t.id} />
              <button className="w-full text-left rounded-lg border border-dashed border-hairline bg-white px-4 py-2.5 text-sm text-muted hover:border-gold transition-colors">
                Not sure yet — general evaluation
              </button>
            </form>
          </div>
        </section>

        {/* Programs + direct rebooking (returning owners) */}
        <section className="mt-8">
          <h2 className="text-xl text-espresso">Programs &amp; pricing</h2>
          <p className="mt-1 text-xs text-muted">
            Returning owners can rebook a program directly. New programs normally start with an evaluation.
          </p>
          <div className="mt-4 grid gap-3">
            {t.programs.map((p) => {
              const total = programTotal(p.price, p.sessions_per_week, p.weeks, p.discount);
              return (
                <div key={p.id} className="rounded-2xl bg-white border border-hairline p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg text-espresso">{p.name}</h3>
                    <span className="text-espresso font-semibold">{cedis(total)}</span>
                  </div>
                  {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
                  <div className="mt-2 text-xs text-muted">
                    {p.sessions_per_week}×/week · {p.weeks} weeks · {totalSessions(p.sessions_per_week, p.weeks)} sessions
                    {p.discount > 0 && <span className="text-gold font-semibold"> · {p.discount}% off</span>}
                    {" · "}{cedis(p.price)}/session
                  </div>
                  <form action={rebookProgram} className="mt-3">
                    <input type="hidden" name="program_id" value={p.id} />
                    <button className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors">
                      Rebook directly
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-hairline px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-walnut">{value}</dd>
    </div>
  );
}
