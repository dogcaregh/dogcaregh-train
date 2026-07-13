import { redirect } from "next/navigation";
import { TrainerNav } from "@/components/trainer-nav";
import { getMyTrainerProfile, getMyEarnings, getMyCashouts } from "@/lib/trainer-data";
import { requestCashout } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const NETWORKS = ["MTN", "Vodafone", "AirtelTigo"];

export default async function EarningsPage({ searchParams }: { searchParams: { requested?: string; err?: string } }) {
  const profile = await getMyTrainerProfile();
  if (!profile) redirect("/trainer/profile");
  const [earnings, cashouts] = await Promise.all([getMyEarnings(), getMyCashouts()]);

  return (
    <>
      <TrainerNav />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Earnings</h1>
        <p className="mt-1 text-sm text-muted">
          Your share is released per completed session (net of the 15% platform fee).
        </p>

        {searchParams.requested && (
          <div className="mt-4 rounded-xl bg-[rgba(185,138,50,0.10)] border border-gold/40 p-4 text-sm text-walnut">
            ✓ Cash-out requested — we&apos;ll send it to your MoMo shortly.
          </div>
        )}
        {searchParams.err === "amount" && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            That amount is more than your available balance.
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Available" value={cedis(earnings.available)} strong />
          <Stat label="Pending cash-out" value={cedis(earnings.pending)} />
          <Stat label="Earned (total)" value={cedis(earnings.earned)} />
        </div>

        <div className="mt-8 rounded-2xl border border-gold/40 bg-[rgba(185,138,50,0.06)] p-5">
          <h2 className="text-lg text-espresso">Request a cash-out</h2>
          {earnings.available <= 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing available to withdraw yet.</p>
          ) : (
            <form action={requestCashout} className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-walnut">Amount (₵)</span>
                  <input name="amount" type="number" min={1} max={earnings.available} step="0.01" required
                    className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-walnut">Network</span>
                  <select name="momo_network" required
                    className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold">
                    {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-walnut">MoMo number</span>
                <input name="momo_number" required placeholder="024 000 0000"
                  className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold" />
              </label>
              <button className="rounded-full bg-mahogany text-ivory text-sm font-semibold px-5 py-2 hover:bg-espresso transition-colors">
                Request cash-out
              </button>
            </form>
          )}
        </div>

        {cashouts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg text-espresso">History</h2>
            <div className="mt-3 grid gap-2">
              {cashouts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-white border border-hairline px-4 py-3 text-sm">
                  <span className="text-walnut">{cedis(Number(c.amount))} · {c.momo_network} {c.momo_number}</span>
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-walnut bg-cream border border-hairline rounded-full px-2 py-0.5 capitalize">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-white border border-hairline p-4">
      <p className={strong ? "text-2xl font-display text-espresso" : "text-lg text-walnut"}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
