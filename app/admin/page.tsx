import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdmin, adminOverview } from "@/lib/admin";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!(await isAdmin())) notFound();
  const o = await adminOverview();

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Admin</h1>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Needs attention</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          <Card label="Pending vettings" value={o.pendingVettings} href="/admin/trainers" cta="Review" highlight={o.pendingVettings > 0} />
          <Card label="Pending cash-outs" value={o.pendingCashouts} href="/admin/cashouts" cta="Process" highlight={o.pendingCashouts > 0} />
          <Card label="Flagged refunds" value={o.flaggedRefunds} href="/admin/bookings" cta="Review" highlight={o.flaggedRefunds > 0} />
          <Card label="Stalled evaluations" value={o.stalledEvals} cta="Paid, not scheduled" highlight={o.stalledEvals > 0} />
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Money</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          <Card label="GMV (paid)" money={cedis(o.gmv)} />
          <Card label="Commission earned" money={cedis(o.commission)} />
          <Card label="Pending payout" money={cedis(o.pendingCashoutAmount)} href="/admin/cashouts" />
          <Card label="Paid out" money={cedis(o.paidOut)} />
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Platform</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Card label="Bookings" value={o.bookings} href="/admin/bookings" cta="View" />
          <Card label="Users" value={o.users} href="/admin/users" cta="View" />
        </div>
      </main>
    </>
  );
}

function Card({
  label,
  value,
  money,
  href,
  cta,
  highlight,
}: {
  label: string;
  value?: number;
  money?: string;
  href?: string;
  cta?: string;
  highlight?: boolean;
}) {
  const inner = (
    <>
      <p className={`font-display text-espresso ${money ? "text-2xl" : "text-4xl"}`}>{money ?? value}</p>
      <p className="mt-1 text-sm text-walnut">{label}</p>
      {cta && <p className="mt-3 text-xs text-gold font-semibold">{cta}{href ? " →" : ""}</p>}
    </>
  );
  const cls = `block rounded-2xl border p-5 ${highlight ? "border-gold bg-[rgba(185,138,50,0.06)]" : "border-hairline bg-white"} ${href ? "hover:border-gold transition-colors" : ""}`;
  return href ? <a href={href} className={cls}>{inner}</a> : <div className={cls}>{inner}</div>;
}
