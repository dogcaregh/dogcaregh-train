import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdmin, adminOverview } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!(await isAdmin())) notFound();
  const o = await adminOverview();

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Admin</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Card label="Pending vettings" value={o.pendingVettings} href="/admin/trainers" cta="Review" highlight={o.pendingVettings > 0} />
          <Card label="Pending cash-outs" value={o.pendingCashouts} href="/admin/cashouts" cta="Process" highlight={o.pendingCashouts > 0} />
          <Card label="Bookings" value={o.bookings} href="/admin/bookings" cta="View" />
          <Card label="Users" value={o.users} href="/admin/users" cta="View" />
        </div>
      </main>
    </>
  );
}

function Card({ label, value, href, cta, highlight }: { label: string; value: number; href: string; cta: string; highlight?: boolean }) {
  return (
    <a href={href} className={`block rounded-2xl border p-5 transition-colors ${highlight ? "border-gold bg-[rgba(185,138,50,0.06)]" : "border-hairline bg-white hover:border-gold"}`}>
      <p className="text-4xl font-display text-espresso">{value}</p>
      <p className="mt-1 text-sm text-walnut">{label}</p>
      <p className="mt-3 text-xs text-gold font-semibold">{cta} →</p>
    </a>
  );
}
