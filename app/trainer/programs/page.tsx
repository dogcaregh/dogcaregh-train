import { TrainerNav } from "@/components/trainer-nav";
import { getMyTrainerProfile, getMyPrograms } from "@/lib/trainer-data";
import { saveProgram, deleteProgram } from "@/app/actions";
import { cedis, programTotal, totalSessions } from "@/lib/pricing";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Program = Awaited<ReturnType<typeof getMyPrograms>>[number];

export default async function ProgramsPage() {
  const profile = await getMyTrainerProfile();
  if (!profile) redirect("/trainer/profile");
  const programs = await getMyPrograms();

  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Programs &amp; pricing</h1>
        <p className="mt-1 text-sm text-muted">
          Name your packages in your own words. Price is per session; discount is a %.
        </p>

        <div className="mt-6 space-y-4">
          {programs.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white border border-hairline p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg text-espresso">{p.name}</h2>
                <span className="text-sm text-espresso font-semibold">
                  {cedis(programTotal(Number(p.price), p.sessions_per_week, p.weeks, Number(p.discount)))}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {p.sessions_per_week}×/week · {p.weeks} wks · {totalSessions(p.sessions_per_week, p.weeks)} sessions · {cedis(Number(p.price))}/session
                {Number(p.discount) > 0 && ` · ${p.discount}% off`}
              </p>
              <details className="mt-3">
                <summary className="text-xs text-gold font-semibold cursor-pointer">Edit</summary>
                <ProgramForm program={p} />
              </details>
              <form action={deleteProgram} className="mt-2">
                <input type="hidden" name="program_id" value={p.id} />
                <button className="text-xs text-red-700 hover:underline">Delete</button>
              </form>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
          <h2 className="text-lg text-espresso">Add a program</h2>
          <ProgramForm />
        </div>
      </main>
    </>
  );
}

function ProgramForm({ program }: { program?: Program }) {
  return (
    <form action={saveProgram} className="mt-3 space-y-3">
      {program && <input type="hidden" name="program_id" value={program.id} />}
      <Field name="name" label="Name" defaultValue={program?.name ?? ""} placeholder="Super, Hyper, Booster…" />
      <Field name="description" label="Description" defaultValue={program?.description ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="sessions_per_week" label="Sessions / week" type="number" defaultValue={program?.sessions_per_week?.toString() ?? "2"} />
        <Field name="weeks" label="Weeks" type="number" defaultValue={program?.weeks?.toString() ?? "4"} />
        <Field name="price" label="Price / session (₵)" type="number" defaultValue={program?.price?.toString() ?? "60"} />
        <Field name="discount" label="Discount (%)" type="number" defaultValue={program?.discount?.toString() ?? "0"} />
      </div>
      <button className="rounded-full bg-mahogany text-ivory text-sm font-semibold px-5 py-2 hover:bg-espresso transition-colors">
        {program ? "Save changes" : "Add program"}
      </button>
    </form>
  );
}

function Field({ name, label, defaultValue, type = "text", placeholder }: { name: string; label: string; defaultValue?: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-walnut">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} min={type === "number" ? 0 : undefined} required={name === "name"}
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
    </label>
  );
}
