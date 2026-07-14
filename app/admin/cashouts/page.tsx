import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdmin, adminListCashouts } from "@/lib/admin";
import { adminProcessCashout } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminCashouts() {
  if (!(await isAdmin())) notFound();
  const cashouts = await adminListCashouts();

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Cash-outs</h1>
        <p className="mt-1 text-sm text-muted">Send the MoMo manually, then mark it paid (or reject with a reason).</p>

        {cashouts.length === 0 ? (
          <p className="mt-8 text-muted">No cash-out requests.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {cashouts.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white border border-hairline p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-espresso font-semibold">{c.trainerName} · {cedis(Number(c.amount))}</p>
                    <p className="text-xs text-muted">{c.momo_network} {c.momo_number} · {new Date(c.created_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  <StatusPill status={c.status} />
                </div>

                {c.status === "pending" ? (
                  <form action={adminProcessCashout} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="cashout_id" value={c.id} />
                    <input name="note" placeholder="reference / reason"
                      className="flex-1 min-w-[160px] rounded-lg border border-hairline bg-ivory px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold" />
                    <button name="action" value="paid" className="rounded-full bg-mahogany text-ivory text-xs font-semibold px-4 py-2 hover:bg-espresso transition-colors">Mark paid</button>
                    <button name="action" value="rejected" className="rounded-full border border-hairline text-walnut text-xs font-semibold px-4 py-2 hover:border-gold transition-colors">Reject</button>
                  </form>
                ) : (
                  c.note && <p className="mt-2 text-xs text-muted">{c.status === "paid" ? "Ref" : "Reason"}: {c.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "paid" ? "text-green-700" : status === "rejected" ? "text-red-700" : "text-gold";
  return (
    <span className={`text-[10px] uppercase tracking-wide font-semibold ${tone} bg-cream border border-hairline rounded-full px-2 py-0.5 capitalize`}>{status}</span>
  );
}
