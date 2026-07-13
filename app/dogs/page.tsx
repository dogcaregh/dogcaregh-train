import { OwnerNav } from "@/components/owner-nav";
import { getMyDogs } from "@/lib/owner-data";
import { addDog } from "@/app/actions";

export const dynamic = "force-dynamic";

const SIZES = ["small", "medium", "large", "xlarge"];
const TEMPERAMENTS = ["friendly", "selective", "nervous"];

export default async function DogsPage({ searchParams }: { searchParams: { next?: string } }) {
  const dogs = await getMyDogs();
  const next = searchParams.next ?? "/dogs";

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-xl px-5 py-8">
        <h1 className="text-3xl text-espresso">My dogs</h1>
        <p className="mt-1 text-sm text-muted">
          Bookings are made per dog. Your DogCareGH dogs show here too — it&apos;s the same profile.
        </p>

        {searchParams.next && dogs.length === 0 && (
          <div className="mt-4 rounded-xl bg-cream border border-hairline p-4 text-sm text-walnut">
            Add your dog to continue booking.
          </div>
        )}

        {dogs.length > 0 && (
          <div className="mt-6 grid gap-3">
            {dogs.map((d) => (
              <div key={d.id} className="rounded-xl bg-white border border-hairline p-4">
                <div className="flex items-center justify-between">
                  <p className="text-espresso font-semibold">{d.name}</p>
                  {d.vaccination_status && <span className="text-xs text-gold font-semibold">✓ Vaccinated</span>}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {[d.breed, d.size, d.age != null ? `${d.age} mo` : null, d.temperament].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
          <h2 className="text-lg text-espresso">Add a dog</h2>
          <form action={addDog} className="mt-3 space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="grid grid-cols-2 gap-4">
              <Field name="name" label="Name" required />
              <Field name="breed" label="Breed" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field name="age" label="Age (months)" type="number" />
              <Select name="size" label="Size" options={SIZES} />
            </div>
            <Select name="temperament" label="Temperament" options={TEMPERAMENTS} />
            <label className="flex items-center gap-2 text-sm text-walnut">
              <input type="checkbox" name="vaccination_status" className="accent-gold" />
              Up to date on vaccinations
            </label>
            <button className="w-full rounded-full bg-walnut text-ivory text-sm font-semibold px-5 py-3 hover:bg-mahogany transition-colors">
              Add dog
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <input name={name} type={type} required={required} min={type === "number" ? 0 : undefined}
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-espresso outline-none focus:border-gold" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <select name={name} defaultValue=""
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-espresso outline-none focus:border-gold capitalize">
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
