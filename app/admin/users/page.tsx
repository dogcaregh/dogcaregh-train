import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdmin, adminListUsers } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminUsers({ searchParams }: { searchParams: { q?: string } }) {
  if (!(await isAdmin())) notFound();
  const users = await adminListUsers(searchParams.q);

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-3xl text-espresso">Users</h1>
        <form className="mt-4">
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search name or email…"
            className="w-full max-w-sm rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-gold"
          />
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
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-muted">No users.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-hairline">
                    <td className="px-4 py-2.5 text-espresso">{u.name}</td>
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
      </main>
    </>
  );
}
