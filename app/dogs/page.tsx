import { OwnerNav } from "@/components/owner-nav";
import { DogCard } from "@/components/dog-card";
import { AddDogForm } from "@/components/add-dog-form";
import { getMyDogs } from "@/lib/owner-data";

export const dynamic = "force-dynamic";

export default async function DogsPage({
  searchParams,
}: {
  searchParams: { next?: string; added?: string; updated?: string };
}) {
  const dogs = await getMyDogs();
  const next = searchParams.next ?? "/dogs";
  // Add/edit errors are now shown inline in their forms; only success lands here.
  const okText = searchParams.added ? "Dog added." : searchParams.updated ? "Changes saved." : null;

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-xl px-5 py-8">
        <h1 className="text-3xl text-espresso">My dogs</h1>
        <p className="mt-1 text-sm text-muted">
          Bookings are made per dog. Your DogCareGH dogs show here too — it&apos;s the same profile.
        </p>

        {okText && (
          <div className="mt-4 rounded-xl border border-gold/40 bg-[rgba(185,138,50,0.10)] p-4 text-sm text-walnut">✓ {okText}</div>
        )}
        {searchParams.next && dogs.length === 0 && (
          <div className="mt-4 rounded-xl bg-cream border border-hairline p-4 text-sm text-walnut">
            Add your dog to continue booking.
          </div>
        )}

        {dogs.length > 0 && (
          <div className="mt-6 grid gap-3">
            {dogs.map((d) => (
              <DogCard key={d.id} dog={d} />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
          <h2 className="text-lg text-espresso">Add a dog</h2>
          <AddDogForm next={next} />
        </div>
      </main>
    </>
  );
}
