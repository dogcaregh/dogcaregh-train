import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdmin, adminListAuditLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

const fmtDT = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const LABEL: Record<string, string> = {
  vetting: "Vetting",
  trainer_active: "Trainer status",
  booking_status: "Booking status",
  refund_flag: "Refund flag",
  cashout: "Cash-out",
  eval_nudge: "Eval reminder",
};

export default async function AdminAudit() {
  if (!(await isAdmin())) notFound();
  const entries = await adminListAuditLog();

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Audit log</h1>
        <p className="mt-1 text-sm text-muted">Recent admin actions — who did what, when.</p>

        {entries.length === 0 ? (
          <p className="mt-8 text-muted">No admin actions recorded yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-white">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Admin</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((a) => (
                  <tr key={a.id} className="border-t border-hairline align-top">
                    <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">{fmtDT(a.created_at)}</td>
                    <td className="px-4 py-2.5 text-walnut">{a.adminName}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-walnut bg-cream border border-hairline rounded-full px-2 py-0.5">
                        {LABEL[a.action] ?? a.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted break-all">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
