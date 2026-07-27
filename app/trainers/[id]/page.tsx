import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { OwnerNav } from "@/components/owner-nav";
import { PublicHeader } from "@/components/public-header";
import { BookingActions } from "@/components/booking-actions";
import {
  getServerUser,
  getTrainer,
  getPublicTrainer,
  getMyDogs,
  getMyOwnerProfile,
  canRebookTrainer,
  getTrainerReviews,
  getPublicTrainerReviews,
  hasEngagementWithTrainer,
  type Trainer,
} from "@/lib/owner-data";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const CARE_APP = "https://dogcaregh.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://train.dogcaregh.com";

type Review = { id: string; rating: number; text: string | null; created_at: string };

export default async function TrainerPage({ params }: { params: { id: string } }) {
  const user = await getServerUser();

  // Signed-out visitors get a public, read-only profile with a login CTA
  // instead of the booking form. Reads go through the service role so no RLS
  // on the shared users table is loosened.
  if (!user) {
    const [t, reviews] = await Promise.all([
      getPublicTrainer(params.id),
      getPublicTrainerReviews(params.id),
    ]);
    if (!t) notFound();

    const host = headers().get("host");
    const returnBase = host ? `https://${host}` : SITE_URL;
    const registerUrl = `${CARE_APP}/register/owner?return_to=${encodeURIComponent(`${returnBase}/trainers/${t.id}`)}`;

    return (
      <>
        <PublicHeader />
        <main className="mx-auto max-w-3xl px-5 py-8">
          <a href="/" className="text-sm text-gold hover:underline">← Back to home</a>
          <ProfileHead t={t} />

          {t.programs.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg text-espresso">Programs &amp; pricing</h2>
              <div className="mt-3 grid gap-2">
                {t.programs.map((p) => (
                  <div key={p.id} className="rounded-xl bg-white border border-hairline p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-espresso">{p.name}</p>
                      <p className="text-sm font-semibold text-espresso">{cedis(p.price)}/session</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {p.sessions_per_week}×/week · {p.weeks} weeks{p.discount > 0 ? ` · ${p.discount}% off` : ""}
                    </p>
                    {p.description && <p className="mt-1 text-sm text-walnut whitespace-pre-line">{p.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-6 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.10)] p-5 text-center">
            <p className="font-semibold text-espresso">Ready to work with {t.name}?</p>
            <p className="mt-1 text-sm text-walnut">
              Book an evaluation ({cedis(t.eval_fee)}) and get a program tailored to your dog. Log in or create an account to book.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <a href={`/login?next=/trainers/${t.id}`} className="rounded-full bg-espresso text-ivory text-sm font-semibold px-5 py-2.5 hover:bg-mahogany transition-colors">
                Log in to book
              </a>
              <a href={registerUrl} className="rounded-full border border-hairline text-walnut text-sm font-semibold px-5 py-2.5 hover:border-gold transition-colors">
                New here? Create an account
              </a>
            </div>
          </div>

          <ReviewSection reviews={reviews} />
        </main>
      </>
    );
  }

  // Signed in — full profile with booking, ranked/personalised data.
  const [t, dogs, profile, canRebook, reviews, engaged] = await Promise.all([
    getTrainer(params.id),
    getMyDogs(),
    getMyOwnerProfile(),
    canRebookTrainer(params.id),
    getTrainerReviews(params.id),
    hasEngagementWithTrainer(params.id),
  ]);
  if (!t) notFound();

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <a href="/trainers" className="text-sm text-gold hover:underline">← All trainers</a>
        <ProfileHead t={t} messageHref={engaged ? `/messages/${t.id}` : undefined} />

        <BookingActions
          trainerId={t.id}
          trainerName={t.name}
          evalFee={t.eval_fee}
          programs={t.programs}
          dogs={dogs}
          defaultDogId={profile?.dog_id ?? null}
          canRebook={canRebook}
          multiDogDiscount={t.multi_dog_discount}
        />

        <ReviewSection reviews={reviews} />
      </main>
    </>
  );
}

/** Shared profile header block (avatar, name, bio, gallery, specialties, meta). */
function ProfileHead({ t, messageHref }: { t: Trainer; messageHref?: string }) {
  return (
    <>
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
      {messageHref && (
        <a href={messageHref} className="mt-3 inline-block text-sm text-gold font-semibold hover:underline">
          💬 Message {t.name}
        </a>
      )}
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
    </>
  );
}

function ReviewSection({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  return (
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
