import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { SubmitButton } from "@/components/submit-button";
import { isAdmin, adminListEvaluations } from "@/lib/admin";
import { adminNudgeTrainerEval } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const fmtDT = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

export default async function AdminEvaluations({ searchParams }: { searchParams: { nudged?: string } }) {
  if (!(await isAdmin())) notFound();
  const evals = await adminListEvaluations();
  const stalled = evals.filter((e) => e.stalled).length;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl text-espresso">Evaluations</h1>
          <span className="text-sm text-muted">{stalled} stalled</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Paid evaluations. Stalled = paid, but the trainer hasn&apos;t scheduled a time yet.
        </p>

        {searchParams.nudged && (
          <div className="mt-4 rounded-xl border border-gold/40 bg-[rgba(185,138,50,0.10)] p-4 text-sm text-walnut">
            ✓ Reminder sent to the trainer.
          </div>
        )}

        {evals.length === 0 ? (
          <p className="mt-8 text-muted">No paid evaluations yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {evals.map((e) => (
              <div key={e.id} className={`rounded-2xl border p-5 ${e.stalled ? "border-gold/50 bg-[rgba(185,138,50,0.06)]" : "border-hairline bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-espresso font-semibold">{e.ownerName} → {e.trainerName}</p>
                    <p className="text-xs text-muted">Dog: {e.dogName} · {cedis(e.fee)} · requested {fmtDate(e.created_at)} · {e.ownerEmail}</p>
                  </div>
                  <StatusPill status={e.status} />
                </div>
                {e.scheduled_at ? (
                  <p className="mt-2 text-xs text-walnut">🗓 Scheduled: <strong className="text-espresso">{fmtDT(e.scheduled_at)}</strong></p>
                ) : e.stalled ? (
                  <form action={adminNudgeTrainerEval} className="mt-3">
                    <input type="hidden" name="evaluation_id" value={e.id} />
                    <SubmitButton pendingText="Reminding…" className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-1.5 hover:bg-mahogany transition-colors disabled:opacity-60">
                      Remind trainer to schedule
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "completed" ? "text-green-700" : status === "cancelled" ? "text-red-700" : status === "scheduled" ? "text-walnut" : "text-gold";
  return (
    <span className={`text-[10px] uppercase tracking-wide font-semibold ${tone} bg-cream border border-hairline rounded-full px-2 py-0.5 capitalize`}>
      {status}
    </span>
  );
}
