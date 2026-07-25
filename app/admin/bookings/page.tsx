import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { SubmitButton } from "@/components/submit-button";
import { isAdmin, adminListBookings } from "@/lib/admin";
import { adminSetBookingStatus, adminFlagRefund } from "@/app/actions";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "confirmed", "paid", "in_progress", "completed_pending", "closed", "cancelled"];
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");
const fmtDT = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: { status?: string; flagged?: string; page?: string };
}) {
  if (!(await isAdmin())) notFound();
  const status = searchParams.status && STATUSES.includes(searchParams.status) ? searchParams.status : undefined;
  const flagged = searchParams.flagged === "1";
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const { rows, total, pageSize } = await adminListBookings({ status, flagged, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (status) u.set("status", status);
    if (flagged) u.set("flagged", "1");
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Bookings</h1>
        <p className="mt-1 text-sm text-muted">Override status or flag a refund (refund is processed manually in Paystack).</p>

        <form className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-walnut">Status</span>
            <select name="status" defaultValue={status ?? ""} className="mt-1 block rounded-lg border border-hairline bg-white px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold capitalize">
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-walnut">
            <input type="checkbox" name="flagged" value="1" defaultChecked={flagged} className="accent-gold" />
            Refund-flagged only
          </label>
          <button className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors">Apply</button>
          {(status || flagged) && <a href="/admin/bookings" className="text-xs text-gold font-semibold hover:underline">Clear</a>}
          <span className="ml-auto text-xs text-muted">{total} result{total === 1 ? "" : "s"}</span>
        </form>

        {rows.length === 0 ? (
          <p className="mt-8 text-muted">No bookings match.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {rows.map((b) => (
              <div key={b.id} className={`rounded-2xl border p-5 ${b.refund_flagged ? "border-red-300 bg-red-50" : "border-hairline bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-espresso font-semibold">{b.ownerName} → {b.trainerName}</p>
                    <p className="text-xs text-muted">Dog: {b.dogName} · {b.done}/{b.sessions_total} sessions · {b.ownerEmail}</p>
                    <p className="text-[11px] text-muted mt-0.5">{fmtDate(b.created_at)}{b.payment_ref ? ` · ref ${b.payment_ref}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-espresso font-semibold">{cedis(Number(b.gross_amount))}</p>
                    <p className="text-[11px] text-muted">payout {cedis(Number(b.trainer_payout))}</p>
                  </div>
                </div>

                {b.sessions.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs font-semibold text-gold cursor-pointer list-none">Sessions ({b.done}/{b.sessions_total}) ▾</summary>
                    <div className="mt-2 grid gap-1">
                      {b.sessions.map((s, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-cream/60 px-3 py-1.5 text-xs">
                          <span className="text-walnut">Session {s.seq ?? i + 1}</span>
                          <span className="text-right">
                            {s.status === "completed" ? (
                              <span className="text-gold font-semibold">✓ Complete</span>
                            ) : s.scheduled_at ? (
                              <span className="text-espresso">{fmtDT(s.scheduled_at)}</span>
                            ) : (
                              <span className="text-muted">Not scheduled</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <form action={adminSetBookingStatus} className="flex items-end gap-2">
                    <input type="hidden" name="booking_id" value={b.id} />
                    <label className="block">
                      <span className="text-[11px] font-semibold text-walnut">Status</span>
                      <select name="status" defaultValue={b.status} className="mt-1 block rounded-lg border border-hairline bg-ivory px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold capitalize">
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                    </label>
                    <SubmitButton pendingText="…" className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors disabled:opacity-60">Update</SubmitButton>
                  </form>

                  <form action={adminFlagRefund} className="flex items-end gap-2">
                    <input type="hidden" name="booking_id" value={b.id} />
                    <input type="hidden" name="flag" value={b.refund_flagged ? "off" : "on"} />
                    <input name="admin_note" defaultValue={b.admin_note ?? ""} placeholder="refund note"
                      className="rounded-lg border border-hairline bg-ivory px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold w-40" />
                    <SubmitButton pendingText="…" className={`rounded-full text-xs font-semibold px-4 py-2 transition-colors disabled:opacity-60 ${b.refund_flagged ? "border border-hairline text-walnut hover:border-gold" : "bg-red-700 text-white hover:bg-red-800"}`}>
                      {b.refund_flagged ? "Clear refund flag" : "Flag refund"}
                    </SubmitButton>
                  </form>
                </div>
                {b.refund_flagged && <p className="mt-2 text-xs text-red-700 font-semibold">⚑ Refund flagged{b.admin_note ? ` — ${b.admin_note}` : ""}</p>}
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            {page > 1 ? <a href={`/admin/bookings${qs(page - 1)}`} className="text-gold font-semibold hover:underline">← Prev</a> : <span />}
            <span className="text-muted">Page {page} of {pages}</span>
            {page < pages ? <a href={`/admin/bookings${qs(page + 1)}`} className="text-gold font-semibold hover:underline">Next →</a> : <span />}
          </div>
        )}
      </main>
    </>
  );
}
