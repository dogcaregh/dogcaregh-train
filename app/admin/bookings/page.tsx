import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdmin, adminListBookings } from "@/lib/admin";
import { adminSetBookingStatus, adminFlagRefund } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "confirmed", "paid", "in_progress", "completed_pending", "closed", "cancelled"];

export default async function AdminBookings() {
  if (!(await isAdmin())) notFound();
  const bookings = await adminListBookings();

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Bookings</h1>
        <p className="mt-1 text-sm text-muted">Override status or flag a refund (refund is processed manually in Paystack).</p>

        {bookings.length === 0 ? (
          <p className="mt-8 text-muted">No bookings yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className={`rounded-2xl border p-5 ${b.refund_flagged ? "border-red-300 bg-red-50" : "border-hairline bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-espresso font-semibold">{b.ownerName} → {b.trainerName}</p>
                    <p className="text-xs text-muted">Dog: {b.dogName} · {b.done}/{b.sessions_total} sessions · {b.ownerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-espresso font-semibold">{cedis(Number(b.gross_amount))}</p>
                    <p className="text-[11px] text-muted">payout {cedis(Number(b.trainer_payout))}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <form action={adminSetBookingStatus} className="flex items-end gap-2">
                    <input type="hidden" name="booking_id" value={b.id} />
                    <label className="block">
                      <span className="text-[11px] font-semibold text-walnut">Status</span>
                      <select name="status" defaultValue={b.status} className="mt-1 block rounded-lg border border-hairline bg-ivory px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold capitalize">
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                    </label>
                    <button className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors">Update</button>
                  </form>

                  <form action={adminFlagRefund} className="flex items-end gap-2">
                    <input type="hidden" name="booking_id" value={b.id} />
                    <input type="hidden" name="flag" value={b.refund_flagged ? "off" : "on"} />
                    <input name="admin_note" defaultValue={b.admin_note ?? ""} placeholder="refund note"
                      className="rounded-lg border border-hairline bg-ivory px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold w-40" />
                    <button className={`rounded-full text-xs font-semibold px-4 py-2 transition-colors ${b.refund_flagged ? "border border-hairline text-walnut hover:border-gold" : "bg-red-700 text-white hover:bg-red-800"}`}>
                      {b.refund_flagged ? "Clear refund flag" : "Flag refund"}
                    </button>
                  </form>
                </div>
                {b.refund_flagged && <p className="mt-2 text-xs text-red-700 font-semibold">⚑ Refund flagged{b.admin_note ? ` — ${b.admin_note}` : ""}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
