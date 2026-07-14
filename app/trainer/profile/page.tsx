import { TrainerNav } from "@/components/trainer-nav";
import { TrainerPhotos } from "@/components/trainer-photos";
import { getMyTrainerProfile } from "@/lib/trainer-data";
import { saveTrainerProfile } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function TrainerProfilePage() {
  const p = await getMyTrainerProfile();

  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">Your trainer profile</p>
        <h1 className="mt-2 text-3xl text-espresso">{p ? "Edit profile" : "Set up your profile"}</h1>
        <p className="mt-2 text-sm text-muted">
          This is what owners see, and it drives your matches. Comma-separate lists.
        </p>

        <form action={saveTrainerProfile} className="mt-8 space-y-5">
          <Area name="bio" label="Short bio" defaultValue={p?.bio ?? ""} />
          <Field name="specialties" label="Specialties" placeholder="Obedience, Puppy training" defaultValue={(p?.specialties ?? []).join(", ")} />
          <Field name="breeds" label="Breeds you work with" placeholder="German Shepherd, All breeds" defaultValue={(p?.breeds ?? []).join(", ")} />
          <Field name="neighbourhoods" label="Neighbourhoods served" placeholder="East Legon, Cantonments" defaultValue={(p?.neighbourhoods ?? []).join(", ")} />
          <Field name="methods" label="Methods" placeholder="Positive reinforcement" defaultValue={p?.methods ?? ""} />
          <Field name="credentials" label="Credentials" defaultValue={p?.credentials ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <Field name="years_experience" label="Years experience" type="number" defaultValue={p?.years_experience?.toString() ?? ""} />
            <Field name="eval_fee" label="Evaluation fee (₵, min 300)" type="number" defaultValue={p?.eval_fee?.toString() ?? "300"} />
          </div>

          <button className="w-full rounded-full bg-mahogany text-ivory text-sm font-semibold px-5 py-3 hover:bg-espresso transition-colors">
            {p ? "Save profile" : "Create profile"}
          </button>
        </form>

        {p ? (
          <div className="mt-6">
            <TrainerPhotos userId={p.user_id} avatarUrl={p.avatar_url} gallery={p.gallery_photos ?? []} />
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">You&apos;ll be able to add photos once your profile is created.</p>
        )}
      </main>
    </>
  );
}

function Field({ name, label, defaultValue, type = "text", placeholder }: { name: string; label: string; defaultValue?: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} min={type === "number" ? 0 : undefined}
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold" />
    </label>
  );
}

function Area({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-walnut">{label}</span>
      <textarea name={name} defaultValue={defaultValue} rows={3}
        className="mt-1 w-full rounded-lg border border-hairline bg-ivory px-3 py-2 text-espresso outline-none focus:border-gold" />
    </label>
  );
}
