import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdmin, adminListUsers } from "@/lib/admin";

export const dynamic = "force-dynamic";

const ROLES = ["admin", "owner", "trainer"] as const;

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; page?: string };
}) {
  if (!(await isAdmin())) notFound();
  const role = (ROLES as readonly string[]).includes(searchParams.role ?? "")
    ? (searchParams.role as "admin" | "owner" | "trainer")
    : undefined;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const { rows, total, pageSize } = await adminListUsers({ q: searchParams.q, role, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (searchParams.q) u.set("q", searchParams.q);
    if (role) u.set("role", role);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Users</h1>

        <form className="mt-4 flex flex-wrap items-end gap-3">
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search name or email…"
            className="w-full max-w-xs rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold"
          />
          <select name="role" defaultValue={role ?? ""} className="rounded-lg border border-hairline bg-white px-2 py-2 text-sm text-espresso outline-none focus:border-gold capitalize">
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="rounded-full bg-walnut text-ivory text-xs font-semibold px-4 py-2 hover:bg-mahogany transition-colors">Search</button>
          {(searchParams.q || role) && <a href="/admin/users" className="text-xs text-gold font-semibold hover:underline">Clear</a>}
          <span className="ml-auto text-xs text-muted">{total} user{total === 1 ? "" : "s"}</span>
        </form>

        <div className="mt-5 overflow-hidden rounded-2xl border border-hairline bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-muted">No users match.</td></tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="border-t border-hairline">
                    <td className="px-4 py-2.5">
                      <a href={`/admin/users/${u.id}`} className="text-espresso font-semibold hover:text-gold hover:underline">{u.name}</a>
                    </td>
                    <td className="px-4 py-2.5 text-walnut">{u.email}</td>
                    <td className="px-4 py-2.5 capitalize text-walnut">{u.role}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {[u.is_owner && "owner", u.is_trainer && "trainer"].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{new Date(u.created_at).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            {page > 1 ? <a href={`/admin/users${qs(page - 1)}`} className="text-gold font-semibold hover:underline">← Prev</a> : <span />}
            <span className="text-muted">Page {page} of {pages}</span>
            {page < pages ? <a href={`/admin/users${qs(page + 1)}`} className="text-gold font-semibold hover:underline">Next →</a> : <span />}
          </div>
        )}
      </main>
    </>
  );
}
