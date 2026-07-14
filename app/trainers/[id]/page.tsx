import { notFound } from "next/navigation";
import { OwnerNav } from "@/components/owner-nav";
import { BookingActions } from "@/components/booking-actions";
import { getTrainer, getMyDogs, getMyOwnerProfile, canRebookTrainer, getTrainerReviews } from "@/lib/owner-data";

export const dynamic = "force-dynamic";

export default async function TrainerPage({ params }: { params: { id: string } }) {
  const [t, dogs, profile, canRebook, reviews] = await Promise.all([
    getTrainer(params.id),
    getMyDogs(),
    getMyOwnerProfile(),
    canRebookTrainer(params.id),
    getTrainerReviews(params.id),
  ]);
  if (!t) notFound();

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <a href="/trainers" className="text-sm text-gold hover:underline">← All trainers</a>

        <div className="mt-3 flex items-center gap-4">
          {t.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.avatar_url} alt={t.name} className="h-16 w-16 shrink-0 rounded-full object-cover border border-hairline" />
          )}
          <div>
            <h1 className="text-3xl text-espresso">{t.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {t.neighbourhoods.join(", ")}
              {t.review_count > 0 && (
                <span className="text-walnut"> · ★ {t.rating_avg.toFixed(1)} ({t.review_count})</span>
              )}
            </p>
          </div>
        </div>
        {t.bio && <p className="mt-3 text-walnut">{t.bio}</p>}

        {t.gallery_photos.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {t.gallery_photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="Trainer gallery" className="h-24 w-full rounded-lg object-cover border border-hairline" />
            ))}
          </div>
        )}

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

        <BookingActions
          trainerId={t.id}
          trainerName={t.name}
          evalFee={t.eval_fee}
          programs={t.programs}
          dogs={dogs}
          defaultDogId={profile?.dog_id ?? null}
          canRebook={canRebook}
        />

        {reviews.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl text-espresso">Reviews</h2>
            <div className="mt-3 grid gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl bg-white border border-hairline p-4">
                  <p className="text-gold text-sm">{"★".repeat(r.rating)}<span className="text-hairline">{"★".repeat(5 - r.rating)}</span></p>
                  {r.text && <p className="mt-1 text-sm text-walnut">{r.text}</p>}
                  <p className="mt-1 text-xs text-muted">A dog owner</p>
                </div>
              ))}
            </div>
          </section>
        )}
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
