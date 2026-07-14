import { OwnerNav } from "@/components/owner-nav";
import { getMyOwnerProfile, listRankedTrainers } from "@/lib/owner-data";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const [profile, trainers] = await Promise.all([
    getMyOwnerProfile(),
    listRankedTrainers(),
  ]);

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">Best fit first</p>
            <h1 className="mt-1 text-3xl text-espresso">Your trainers</h1>
          </div>
          <a href="/onboarding" className="text-sm text-gold font-semibold hover:underline whitespace-nowrap">
            {profile ? "Edit my answers" : "Answer questions"}
          </a>
        </div>

        {!profile && (
          <div className="mt-5 rounded-xl bg-cream border border-hairline p-4 text-sm text-walnut">
            <a href="/onboarding" className="font-semibold text-espresso underline">
              Answer a few quick questions
            </a>{" "}
            and we&apos;ll rank trainers by fit for your dog. Below is everyone for now.
          </div>
        )}

        {trainers.length === 0 ? (
          <p className="mt-8 text-muted">No trainers available yet.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {trainers.map((t, i) => (
              <a
                key={t.id}
                href={`/trainers/${t.id}`}
                className="block rounded-2xl bg-white border border-hairline p-5 hover:border-gold transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {t.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar_url} alt={t.name} className="h-9 w-9 shrink-0 rounded-full object-cover border border-hairline" />
                    )}
                    <h2 className="text-xl text-espresso">{t.name}</h2>
                  </div>
                  {i === 0 && profile && t.score > 0 && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-gold bg-cream border border-hairline rounded-full px-2 py-0.5">
                      Top match
                    </span>
                  )}
                </div>
                {t.review_count > 0 && (
                  <p className="mt-0.5 text-xs text-walnut">
                    ★ {t.rating_avg.toFixed(1)} <span className="text-muted">({t.review_count})</span>
                  </p>
                )}
                <p className="mt-1 text-sm text-muted line-clamp-2">{t.bio}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="text-xs text-walnut bg-ivory border border-hairline rounded-full px-2 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted">{t.neighbourhoods.slice(0, 2).join(", ")}</span>
                  <span className="text-espresso font-semibold">
                    {t.fromPrice != null ? `from ${cedis(t.fromPrice)}/session` : "—"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted">Evaluation {cedis(t.eval_fee)}</div>
              </a>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
