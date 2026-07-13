import { OwnerNav } from "@/components/owner-nav";
import { getMyOwnerProfile, getMyDogs } from "@/lib/owner-data";
import { saveOwnerProfile } from "@/app/actions";

export const dynamic = "force-dynamic";

const GOALS = [
  "Obedience",
  "Puppy training",
  "Behaviour / reactivity",
  "Protection / guard",
];
const AREAS = [
  "East Legon", "Cantonments", "Airport Residential", "Osu", "Labone",
  "Tema", "Sakumono", "Spintex", "Other",
];

export default async function Onboarding() {
  const [profile, dogs] = await Promise.all([getMyOwnerProfile(), getMyDogs()]);

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">A few quick questions</p>
        <h1 className="mt-2 text-3xl text-espresso">Tell us about your dog</h1>
        <p className="mt-2 text-sm text-muted">
          Nothing is asked twice — your answers rank the right trainers first.
        </p>

        {dogs.length === 0 ? (
          <div className="mt-8 rounded-xl bg-cream border border-hairline p-5 text-sm text-walnut">
            First, <a href="/dogs?next=/onboarding" className="font-semibold text-espresso underline">add your dog</a> — bookings are made per dog.
          </div>
        ) : (
        <form action={saveOwnerProfile} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-walnut">Which dog?</span>
            <select name="dog_id" defaultValue={profile?.dog_id ?? dogs[0].id}
              className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold">
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.breed ? ` · ${d.breed}` : ""}</option>
              ))}
            </select>
            <a href="/dogs?next=/onboarding" className="mt-1 inline-block text-xs text-gold font-semibold hover:underline">+ Add another dog</a>
          </label>

          <Select name="goal" label="Main goal" options={GOALS} defaultValue={profile?.goal ?? ""} />
          <Select name="neighbourhood" label="Neighbourhood" options={AREAS} defaultValue={profile?.neighbourhood ?? ""} />

          <div className="grid grid-cols-2 gap-4">
            <Field name="budget" label="Budget per session (₵)" type="number" defaultValue={profile?.budget?.toString() ?? ""} />
            <Field name="schedule" label="Preferred schedule" defaultValue={profile?.schedule ?? ""} placeholder="e.g. weekday evenings" />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-walnut text-ivory text-sm font-semibold px-5 py-3 hover:bg-mahogany transition-colors"
          >
            Find my trainers
          </button>
        </form>
        )}
      </main>
    </>
  );
}

function Field({
  name, label, defaultValue, type = "text", placeholder,
}: {
  name: string; label: string; defaultValue?: string; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold"
      />
    </label>
  );
}

function Select({
  name, label, options, defaultValue,
}: {
  name: string; label: string; options: string[]; defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
