import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdmin, adminGetUser } from "@/lib/admin";
import { cedis } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

export default async function AdminUserDetail({ params }: { params: { id: string } }) {
  if (!(await isAdmin())) notFound();
  const data = await adminGetUser(params.id);
  if (!data) notFound();
  const { user, dogs, bookings, evaluations, trainer } = data;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <a href="/admin/users" className="text-sm text-gold hover:underline">← All users</a>
        <h1 className="mt-2 text-3xl text-espresso">{user.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {user.email} · <span className="capitalize">{user.role}</span> ·{" "}
          {[user.is_owner && "owner", user.is_trainer && "trainer"].filter(Boolean).join(" · ") || "—"} · joined {fmtDate(user.created_at)}
        </p>

        {trainer && (
          <Section title="Trainer profile">
            <p className="text-sm text-walnut">
              Vetting <span className="capitalize font-semibold text-espresso">{trainer.vetting_status}</span>
              {trainer.vetting_status === "verified" && !trainer.active && <span className="text-red-700 font-semibold"> · paused</span>}
              {" · "}eval {cedis(Number(trainer.eval_fee))}
              {trainer.location ? ` · 📍 ${trainer.location}` : ""}
              {trainer.phone ? ` · 📞 ${trainer.phone}` : ""}
            </p>
            <a href="/admin/trainers" className="mt-1 inline-block text-xs text-gold font-semibold hover:underline">Manage in vetting →</a>
          </Section>
        )}

        <Section title={`Dogs (${dogs.length})`}>
          {dogs.length === 0 ? <Empty>No dogs.</Empty> : (
            <div className="flex flex-wrap gap-2">
              {dogs.map((d) => (
                <span key={d.id} className="text-xs text-walnut bg-cream border border-hairline rounded-full px-3 py-1">
                  {d.name}{d.breed ? ` · ${d.breed}` : ""}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Bookings (${bookings.length})`}>
          {bookings.length === 0 ? <Empty>No bookings.</Empty> : (
            <div className="grid gap-2">
              {bookings.map((b) => (
                <Row key={b.id} left={`${b.trainerName}`} mid={<span className="capitalize">{b.status.replace(/_/g, " ")}</span>} right={`${cedis(Number(b.gross_amount))} · ${fmtDate(b.created_at)}`} />
              ))}
            </div>
          )}
        </Section>

        <Section title={`Evaluations (${evaluations.length})`}>
          {evaluations.length === 0 ? <Empty>No evaluations.</Empty> : (
            <div className="grid gap-2">
              {evaluations.map((e) => (
                <Row key={e.id} left={`${e.trainerName}`} mid={<span className="capitalize">{e.status}</span>} right={`${cedis(Number(e.fee))} · ${fmtDate(e.created_at)}`} />
              ))}
            </div>
          )}
        </Section>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-hairline bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
function Row({ left, mid, right }: { left: React.ReactNode; mid: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-cream/50 px-3 py-2 text-sm">
      <span className="text-espresso font-medium">{left}</span>
      <span className="text-xs text-walnut">{mid}</span>
      <span className="text-xs text-muted">{right}</span>
    </div>
  );
}
