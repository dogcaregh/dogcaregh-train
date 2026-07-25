import { OwnerNav } from "@/components/owner-nav";
import { DogCard } from "@/components/dog-card";
import { getMyDogs } from "@/lib/owner-data";
import { addDog } from "@/app/actions";

export const dynamic = "force-dynamic";

const SIZES = ["small", "medium", "large", "xlarge"];
const TEMPERAMENTS = ["friendly", "selective", "nervous"];

const ERR_MSG: Record<string, string> = {
  name: "Please enter your dog's name.",
  add: "Couldn't add your dog — please try again.",
  update: "Couldn't save your changes — please try again.",
};

export default async function DogsPage({
  searchParams,
}: {
  searchParams: { next?: string; err?: string; added?: string; updated?: string };
}) {
  const dogs = await getMyDogs();
  const next = searchParams.next ?? "/dogs";
  const errText = searchParams.err ? ERR_MSG[searchParams.err] : null;
  const okText = searchParams.added ? "Dog added." : searchParams.updated ? "Changes saved." : null;

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-xl px-5 py-8">
        <h1 className="text-3xl text-espresso">My dogs</h1>
        <p className="mt-1 text-sm text-muted">
          Bookings are made per dog. Your DogCareGH dogs show here too — it&apos;s the same profile.
        </p>

        {errText && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errText}</div>
        )}
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
