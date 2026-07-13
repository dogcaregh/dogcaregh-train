import { notFound } from "next/navigation";
import { OwnerNav } from "@/components/owner-nav";
import { BookingActions } from "@/components/booking-actions";
import { getTrainer, getMyDogs, getMyOwnerProfile } from "@/lib/owner-data";

export const dynamic = "force-dynamic";

export default async function TrainerPage({ params }: { params: { id: string } }) {
  const [t, dogs, profile] = await Promise.all([
    getTrainer(params.id),
    getMyDogs(),
    getMyOwnerProfile(),
  ]);
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

        <BookingActions
          trainerId={t.id}
          trainerName={t.name}
          evalFee={t.eval_fee}
          programs={t.programs}
          dogs={dogs}
          defaultDogId={profile?.dog_id ?? null}
        />
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
