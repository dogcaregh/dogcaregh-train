import { notFound } from "next/navigation";
import { isAdmin, listAllTrainers } from "@/lib/admin";
import { setTrainerVetting } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const ORDER: Record<string, number> = { pending: 0, verified: 1, rejected: 2 };

export default async function AdminTrainersPage() {
  if (!(await isAdmin())) notFound();
  const trainers = (await listAllTrainers()).sort(
    (a, b) => (ORDER[a.vetting_status] ?? 9) - (ORDER[b.vetting_status] ?? 9)
  );
  const pending = trainers.filter((t) => t.vetting_status === "pending").length;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">Admin</p>
          <h1 className="mt-1 text-3xl text-espresso">Trainer vetting</h1>
        </div>
        <span className="text-sm text-muted">{pending} pending</span>
      </div>

      {trainers.length === 0 ? (
        <p className="mt-8 text-muted">No trainers yet.</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {trainers.map((t) => (
            <div key={t.id} className="rounded-2xl bg-white border border-hairline p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg text-espresso">{t.name.replace(/^DEMO · /, "")}</h2>
                <StatusPill status={t.vetting_status} />
              </div>
              <p className="text-xs text-muted mt-0.5">{t.email} · eval {cedis(t.eval_fee)}</p>
              {t.specialties.length > 0 && (
                <p className="mt-2 text-sm text-walnut">{t.specialties.join(", ")}</p>
              )}
              <div className="mt-3 flex gap-2">
                {t.vetting_status !== "verified" && (
                  <VetButton trainerId={t.id} status="verified" label="Approve" primary />
                )}
                {t.vetting_status !== "rejected" && (
                  <VetButton trainerId={t.id} status="rejected" label="Reject" />
                )}
                {t.vetting_status !== "pending" && (
                  <VetButton trainerId={t.id} status="pending" label="Reset to pending" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function VetButton({ trainerId, status, label, primary }: { trainerId: string; status: string; label: string; primary?: boolean }) {
  return (
    <form action={setTrainerVetting}>
      <input type="hidden" name="trainer_id" value={trainerId} />
      <input type="hidden" name="status" value={status} />
      <button
        className={`rounded-full text-xs font-semibold px-4 py-1.5 transition-colors ${
          primary
            ? "bg-mahogany text-ivory hover:bg-espresso"
            : "border border-hairline text-walnut hover:border-gold"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "verified" ? "text-green-700" : status === "rejected" ? "text-red-700" : "text-gold";
  return (
    <span className={`text-[10px] uppercase tracking-wide font-semibold ${tone} bg-cream border border-hairline rounded-full px-2 py-0.5 capitalize`}>
      {status}
    </span>
  );
}
