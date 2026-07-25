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

export const BOOKINGS_PAGE_SIZE = 25;

/** Program bookings with owner/trainer/dog + sessions, filtered + paginated. */
export async function adminListBookings(opts: { status?: string; flagged?: boolean; page?: number } = {}) {
  const { supabase } = await requireUser();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * BOOKINGS_PAGE_SIZE;

  let query = supabase
    .from("trainer_bookings")
    .select(
      "id, status, sessions_total, gross_amount, trainer_payout, refund_flagged, admin_note, created_at, payment_ref, " +
        "owner:owner_id(name, email), trainer_profiles(users(name)), dogs(name), trainer_sessions(status, seq, scheduled_at)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + BOOKINGS_PAGE_SIZE - 1);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.flagged) query = query.eq("refund_flagged", true);

  const { data, count } = await query;

  type Sess = { status: string; seq: number | null; scheduled_at: string | null };
  type Row = {
    id: string; status: string; sessions_total: number; gross_amount: number; trainer_payout: number;
    refund_flagged: boolean; admin_note: string | null; created_at: string; payment_ref: string | null;
    owner: { name?: string; email?: string } | { name?: string; email?: string }[] | null;
    trainer_profiles: unknown; dogs: { name?: string } | { name?: string }[] | null;
    trainer_sessions: Sess[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const list = rows.map((b) => {
    const sessions = b.trainer_sessions ?? [];
    const owner = Array.isArray(b.owner) ? b.owner[0] : b.owner;
    return {
      ...b,
      ownerName: owner?.name ?? "—",
      ownerEmail: owner?.email ?? "",
      trainerName: name1(b.trainer_profiles),
      dogName: (Array.isArray(b.dogs) ? b.dogs[0]?.name : b.dogs?.name) ?? "—",
      done: sessions.filter((s) => s.status === "completed").length,
      sessions: [...sessions].sort((a, z) => (a.seq ?? 99) - (z.seq ?? 99)),
    };
  });
  return { rows: list, total: count ?? 0, page, pageSize: BOOKINGS_PAGE_SIZE };
}

/** Paid evaluations for admin oversight (unstick stalled ones). */
export async function adminListEvaluations() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("trainer_evaluations")
    .select("id, fee, status, scheduled_at, paid_at, created_at, owner:owner_id(name, email), trainer_profiles(users(name)), dogs(name)")
    .not("paid_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  type Row = {
    id: string; fee: number; status: string; scheduled_at: string | null; created_at: string;
    owner: { name?: string; email?: string } | { name?: string; email?: string }[] | null;
    trainer_profiles: unknown; dogs: { name?: string } | { name?: string }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  return rows.map((e) => {
    const owner = Array.isArray(e.owner) ? e.owner[0] : e.owner;
    return {
      id: e.id,
      fee: Number(e.fee),
      status: e.status,
      scheduled_at: e.scheduled_at,
      created_at: e.created_at,
      ownerName: owner?.name ?? "—",
      ownerEmail: owner?.email ?? "",
      trainerName: name1(e.trainer_profiles),
      dogName: (Array.isArray(e.dogs) ? e.dogs[0]?.name : e.dogs?.name) ?? "—",
      // Stalled = paid, but the trainer never scheduled it.
      stalled: e.status === "requested",
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

/** Operational + finance overview for the admin hub. */
export async function adminOverview() {
  const { supabase } = await requireUser();
  const round = (n: number) => Math.round(n * 100) / 100;

  const [pv, us, bookingsRes, evalsRes, cashoutsRes] = await Promise.all([
    supabase.from("trainer_profiles").select("id", { count: "exact", head: true }).eq("vetting_status", "pending"),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("trainer_bookings").select("gross_amount, commission_amount, refund_flagged, status"),
    supabase.from("trainer_evaluations").select("fee, trainer_payout, paid_at, status"),
    supabase.from("trainer_cashout_requests").select("amount, status"),
  ]);

  // GMV + commission accrue once a booking/evaluation is paid.
  const bookings = (bookingsRes.data ?? []) as { gross_amount: number; commission_amount: number; refund_flagged: boolean; status: string }[];
  let gmv = 0, commission = 0, flaggedRefunds = 0;
  for (const b of bookings) {
    if (b.refund_flagged) flaggedRefunds++;
    if (!["pending", "cancelled"].includes(b.status)) {
      gmv += Number(b.gross_amount);
      commission += Number(b.commission_amount);
    }
  }

  const evals = (evalsRes.data ?? []) as { fee: number; trainer_payout: number; paid_at: string | null; status: string }[];
  let stalledEvals = 0;
  for (const e of evals) {
    if (!e.paid_at) continue;
    gmv += Number(e.fee);
    commission += Number(e.fee) - Number(e.trainer_payout);
    if (e.status === "requested") stalledEvals++; // paid but the trainer never scheduled it
  }

  const cashouts = (cashoutsRes.data ?? []) as { amount: number; status: string }[];
  let pendingCashoutAmount = 0, paidOut = 0, pendingCashouts = 0;
  for (const c of cashouts) {
    if (c.status === "pending") { pendingCashoutAmount += Number(c.amount); pendingCashouts++; }
    else if (c.status === "paid") paidOut += Number(c.amount);
  }

  return {
    pendingVettings: pv.count ?? 0,
    pendingCashouts,
    bookings: bookings.length,
    users: us.count ?? 0,
    gmv: round(gmv),
    commission: round(commission),
    pendingCashoutAmount: round(pendingCashoutAmount),
    paidOut: round(paidOut),
    flaggedRefunds,
    stalledEvals,
  };
}

export type AdminTrainer = {
  id: string;
  specialties: string[];
  breeds: string[];
  neighbourhoods: string[];
  methods: string | null;
  credentials: string | null;
  years_experience: number | null;
  bio: string | null;
  avatar_url: string | null;
  gallery_photos: string[];
  eval_fee: number;
  vetting_status: string;
  active: boolean;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
};

/** All trainer profiles for the admin queue (admins can read all via RLS). */
export async function listAllTrainers(): Promise<AdminTrainer[]> {
  const { supabase } = await requireUser();
  const SEL =
    "id, specialties, breeds, neighbourhoods, methods, credentials, years_experience, bio, avatar_url, gallery_photos, eval_fee, vetting_status, active, created_at, users(name, email)";
  // Prefer contact columns; fall back if the migration isn't applied yet.
  const withContact = await supabase.from("trainer_profiles").select(SEL + ", phone, location").order("created_at", { ascending: false });
  const data = withContact.error
    ? (await supabase.from("trainer_profiles").select(SEL).order("created_at", { ascending: false })).data
    : withContact.data;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row): AdminTrainer => {
    const u = row.users as unknown;
    const rec = Array.isArray(u) ? u[0] : (u as { name?: string; email?: string } | null);
    return {
      id: row.id as string,
      specialties: (row.specialties as string[]) ?? [],
      breeds: (row.breeds as string[]) ?? [],
      neighbourhoods: (row.neighbourhoods as string[]) ?? [],
      methods: (row.methods as string | null) ?? null,
      credentials: (row.credentials as string | null) ?? null,
      years_experience: (row.years_experience as number | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      gallery_photos: (row.gallery_photos as string[]) ?? [],
      eval_fee: Number(row.eval_fee),
      vetting_status: row.vetting_status as string,
      active: row.active as boolean,
      created_at: row.created_at as string,
      name: rec?.name ?? "Trainer",
      email: rec?.email ?? "",
      phone: (row.phone as string | null) ?? null,
      location: (row.location as string | null) ?? null,
    };
  });
}
