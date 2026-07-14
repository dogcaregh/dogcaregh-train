import { cache } from "react";
import { requireUser } from "@/lib/owner-data";

/** Current user's role (own row is readable under existing users RLS). */
export const getMyRole = cache(async (): Promise<string | null> => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  return data?.role ?? null;
});

export async function isAdmin(): Promise<boolean> {
  return (await getMyRole()) === "admin";
}

function name1(rel: unknown): string {
  if (!rel) return "—";
  const u = (rel as { users?: unknown }).users ?? rel;
  if (Array.isArray(u)) return (u[0] as { name?: string })?.name ?? "—";
  return (u as { name?: string })?.name ?? "—";
}

/** Users list (admin reads all via is_admin() RLS). */
export async function adminListUsers(q?: string) {
  const { supabase } = await requireUser();
  let query = supabase
    .from("users")
    .select("id, name, email, role, is_owner, is_trainer, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q && q.trim()) query = query.or(`name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);
  const { data } = await query;
  return data ?? [];
}

/** Program bookings with owner/trainer/dog + sessions, for override. */
export async function adminListBookings() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("trainer_bookings")
    .select(
      "id, status, sessions_total, gross_amount, trainer_payout, refund_flagged, admin_note, created_at, " +
        "owner:owner_id(name, email), trainer_profiles(users(name)), dogs(name), trainer_sessions(status)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  type Row = {
    id: string; status: string; sessions_total: number; gross_amount: number; trainer_payout: number;
    refund_flagged: boolean; admin_note: string | null; created_at: string;
    owner: { name?: string; email?: string } | { name?: string; email?: string }[] | null;
    trainer_profiles: unknown; dogs: { name?: string } | { name?: string }[] | null;
    trainer_sessions: { status: string }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  return rows.map((b) => {
    const sessions = b.trainer_sessions ?? [];
    const owner = Array.isArray(b.owner) ? b.owner[0] : b.owner;
    return {
      ...b,
      ownerName: owner?.name ?? "—",
      ownerEmail: owner?.email ?? "",
      trainerName: name1(b.trainer_profiles),
      dogName: (Array.isArray(b.dogs) ? b.dogs[0]?.name : b.dogs?.name) ?? "—",
      done: sessions.filter((s) => s.status === "completed").length,
    };
  });
}

/** Cash-out requests, pending first. */
export async function adminListCashouts() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("trainer_cashout_requests")
    .select("id, amount, momo_network, momo_number, status, note, created_at, paid_at, trainer_profiles(users(name))")
    .order("created_at", { ascending: false });
  const order: Record<string, number> = { pending: 0, paid: 1, rejected: 2 };
  return (data ?? [])
    .map((c) => ({ ...c, trainerName: name1(c.trainer_profiles) }))
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

/** Small counts for the hub. */
export async function adminOverview() {
  const { supabase } = await requireUser();
  const [pv, pc, bk, us] = await Promise.all([
    supabase.from("trainer_profiles").select("id", { count: "exact", head: true }).eq("vetting_status", "pending"),
    supabase.from("trainer_cashout_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("trainer_bookings").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
  ]);
  return {
    pendingVettings: pv.count ?? 0,
    pendingCashouts: pc.count ?? 0,
    bookings: bk.count ?? 0,
    users: us.count ?? 0,
  };
}

export type AdminTrainer = {
  id: string;
  specialties: string[];
  eval_fee: number;
  vetting_status: string;
  active: boolean;
  created_at: string;
  name: string;
  email: string;
};

/** All trainer profiles for the admin queue (admins can read all via RLS). */
export async function listAllTrainers(): Promise<AdminTrainer[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("trainer_profiles")
    .select("id, specialties, eval_fee, vetting_status, active, created_at, users(name, email)")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row): AdminTrainer => {
    const u = row.users as unknown;
    const rec = Array.isArray(u) ? u[0] : (u as { name?: string; email?: string } | null);
    return {
      id: row.id,
      specialties: row.specialties ?? [],
      eval_fee: Number(row.eval_fee),
      vetting_status: row.vetting_status,
      active: row.active,
      created_at: row.created_at,
      name: rec?.name ?? "Trainer",
      email: rec?.email ?? "",
    };
  });
}
