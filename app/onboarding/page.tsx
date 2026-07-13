import { OwnerNav } from "@/components/owner-nav";
import { getMyOwnerProfile } from "@/lib/owner-data";
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
  const profile = await getMyOwnerProfile();

  return (
    <>
      <OwnerNav />
      <main className="mx-auto max-w-xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">A few quick questions</p>
        <h1 className="mt-2 text-3xl text-espresso">Tell us about your dog</h1>
        <p className="mt-2 text-sm text-muted">
          Nothing is asked twice — your answers rank the right trainers first.
        </p>

        <form action={saveOwnerProfile} className="mt-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field name="dog_name" label="Dog's name" defaultValue={profile?.dog_name ?? ""} />
            <Field name="dog_breed" label="Breed" defaultValue={profile?.dog_breed ?? ""} />
          </div>

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
