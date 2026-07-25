import { redirect } from "next/navigation";
import { TrainerNav } from "@/components/trainer-nav";
import { ProgramForm } from "@/components/program-form";
import { DeleteProgram } from "@/components/delete-program";
import { SubmitButton } from "@/components/submit-button";
import { getMyTrainerProfile, getMyPrograms } from "@/lib/trainer-data";
import { setProgramActive } from "@/app/actions";
import { cedis, programTotal, totalSessions } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function ProgramsPage({ searchParams }: { searchParams: { saved?: string; err?: string } }) {
  const profile = await getMyTrainerProfile();
  if (!profile) redirect("/trainer/profile");
  const programs = await getMyPrograms();

  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Programs &amp; pricing</h1>
        <p className="mt-1 text-sm text-muted">
          Name your packages in your own words. Price is per session; discount is a %. Owners book these, and you recommend them to leads.
        </p>

        {searchParams.err === "name" && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Please give the program a name.</div>
        )}
        {searchParams.saved && (
          <div className="mt-4 rounded-xl border border-gold/40 bg-[rgba(185,138,50,0.10)] p-3 text-sm text-walnut">✓ Program saved.</div>
        )}

        {programs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-hairline bg-cream p-5 text-sm text-walnut">
            No programs yet — add your first below. It&apos;s what owners book, so you can&apos;t take bookings without one.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {programs.map((p) => {
              const total = programTotal(Number(p.price), p.sessions_per_week, p.weeks, Number(p.discount));
              return (
                <div key={p.id} className={`rounded-2xl bg-white border border-hairline p-5 ${p.active ? "" : "opacity-70"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg text-espresso">{p.name}</h2>
                      {!p.active && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted bg-cream border border-hairline rounded-full px-2 py-0.5">Inactive</span>
                      )}
                    </div>
                    <span className="text-sm text-espresso font-semibold whitespace-nowrap">{cedis(total)}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {p.sessions_per_week}×/week · {p.weeks} wks · {totalSessions(p.sessions_per_week, p.weeks)} sessions · {cedis(Number(p.price))}/session
                    {Number(p.discount) > 0 && ` · ${p.discount}% off`}
                  </p>
                  {p.description && <p className="mt-1 text-sm text-walnut whitespace-pre-line">{p.description}</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-hairline pt-3">
                    <form action={setProgramActive}>
                      <input type="hidden" name="program_id" value={p.id} />
                      <input type="hidden" name="active" value={p.active ? "off" : "on"} />
                      <SubmitButton pendingText="…" className="text-xs text-gold font-semibold hover:underline disabled:opacity-60">
                        {p.active ? "Deactivate" : "Activate"}
                      </SubmitButton>
                    </form>
                    <DeleteProgram id={p.id} />
                  </div>

                  <details className="mt-2">
                    <summary className="text-xs text-gold font-semibold cursor-pointer list-none">Edit ▾</summary>
                    <ProgramForm program={p} />
                  </details>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
          <h2 className="text-lg text-espresso">Add a program</h2>
          <ProgramForm />
        </div>
      </main>
    </>
  );
}
