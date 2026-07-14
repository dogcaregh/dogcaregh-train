import { cache } from "react";
import { requireUser } from "@/lib/owner-data";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type SC = ReturnType<typeof createServerSupabaseClient>;

export type TrainerProfile = {
  id: string;
  user_id: string;
  bio: string | null;
  specialties: string[];
  breeds: string[];
  neighbourhoods: string[];
  methods: string | null;
  credentials: string | null;
  years_experience: number | null;
  eval_fee: number;
  vetting_status: string;
  active: boolean;
  rating_avg: number;
  review_count: number;
  avatar_url: string | null;
  gallery_photos: string[];
};

/** My trainer profile (or null if I haven't created one). Deduped per request. */
export const getMyTrainerProfile = cache(async (): Promise<TrainerProfile | null> => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("trainer_profiles")
    .select(
      "id, user_id, bio, specialties, breeds, neighbourhoods, methods, credentials, years_experience, eval_fee, vetting_status, active, rating_avg, review_count, avatar_url, gallery_photos"
    )
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as TrainerProfile) ?? null;
});

export async function getMyPrograms() {
  const profile = await getMyTrainerProfile();
  if (!profile) return [];
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("trainer_programs")
    .select("id, name, description, weeks, sessions_per_week, price, discount, is_custom, active")
    .eq("trainer_id", profile.id)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export type Lead = {
  id: string;
  owner_id: string;
  program_id: string | null;
  fee: number;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  ownerName: string;
  goal: string | null;
  dogBreed: string | null;
  dogName: string | null;
  budget: number | null;
  neighbourhood: string | null;
  hasRecommendation: boolean;
};

/** Evaluation requests sent to me, enriched with the owner's intake. */
export async function getMyLeads(): Promise<Lead[]> {
  const profile = await getMyTrainerProfile();
  if (!profile) return [];
  const { supabase } = await requireUser();

  const { data: evals } = await supabase
    .from("trainer_evaluations")
    .select("id, owner_id, program_id, dog_id, fee, status, scheduled_at, created_at")
    .eq("trainer_id", profile.id)
    .not("paid_at", "is", null) // only surface paid evaluations
    .order("created_at", { ascending: false });
  if (!evals || evals.length === 0) return [];

  const ownerIds = [...new Set(evals.map((e) => e.owner_id))];
  const evalIds = evals.map((e) => e.id);
  const dogIds = [...new Set(evals.map((e) => e.dog_id).filter(Boolean))] as string[];

  const [{ data: owners }, { data: intakes }, { data: recos }, { data: dogRows }] = await Promise.all([
    supabase.from("users").select("id, name").in("id", ownerIds),
    supabase
      .from("trainer_owner_profiles")
      .select("user_id, goal, budget, neighbourhood")
      .in("user_id", ownerIds),
    supabase.from("trainer_recommendations").select("evaluation_id").in("evaluation_id", evalIds),
    dogIds.length
      ? supabase.from("dogs").select("id, name, breed").in("id", dogIds)
      : Promise.resolve({ data: [] as { id: string; name: string; breed: string | null }[] }),
  ]);

  const nameById = new Map((owners ?? []).map((o) => [o.id, o.name]));
  const intakeById = new Map((intakes ?? []).map((i) => [i.user_id, i]));
  const recoEvalIds = new Set((recos ?? []).map((r) => r.evaluation_id));
  const dogById = new Map((dogRows ?? []).map((d) => [d.id, d]));

  return evals.map((e): Lead => {
    const intake = intakeById.get(e.owner_id);
    const dog = e.dog_id ? dogById.get(e.dog_id) : null;
    return {
      id: e.id,
      owner_id: e.owner_id,
      program_id: e.program_id,
      fee: Number(e.fee),
      status: e.status,
      scheduled_at: e.scheduled_at,
      created_at: e.created_at,
      ownerName: nameById.get(e.owner_id) ?? "An owner",
      goal: intake?.goal ?? null,
      dogBreed: dog?.breed ?? null,
      dogName: dog?.name ?? null,
      budget: intake?.budget != null ? Number(intake.budget) : null,
      neighbourhood: intake?.neighbourhood ?? null,
      hasRecommendation: recoEvalIds.has(e.id),
    };
  });
}

export type Earnings = { earned: number; pending: number; available: number };

/** Trainer's money: released (net) session amounts + completed paid eval
 *  payouts, minus already-requested/paid cash-outs. */
export async function trainerEarnings(supabase: SC, trainerId: string): Promise<Earnings> {
  const round = (n: number) => Math.round(n * 100) / 100;

  const [{ data: bookings }, { data: evals }, { data: cashouts }] = await Promise.all([
    supabase
      .from("trainer_bookings")
      .select("trainer_sessions(release_amount, released_at)")
      .eq("trainer_id", trainerId),
    supabase
      .from("trainer_evaluations")
      .select("trainer_payout")
      .eq("trainer_id", trainerId)
      .eq("status", "completed")
      .not("paid_at", "is", null),
    supabase
      .from("trainer_cashout_requests")
      .select("amount, status")
      .eq("trainer_id", trainerId),
  ]);

  let earned = 0;
  for (const b of bookings ?? []) {
    const sessions = (b.trainer_sessions ?? []) as { release_amount: number; released_at: string | null }[];
    for (const s of sessions) if (s.released_at) earned += Number(s.release_amount);
  }
  for (const e of evals ?? []) earned += Number(e.trainer_payout);

  let reserved = 0;
  let pending = 0;
  for (const c of cashouts ?? []) {
    if (c.status === "pending" || c.status === "paid") reserved += Number(c.amount);
    if (c.status === "pending") pending += Number(c.amount);
  }

  return { earned: round(earned), pending: round(pending), available: round(earned - reserved) };
}

export async function getMyEarnings(): Promise<Earnings> {
  const profile = await getMyTrainerProfile();
  if (!profile) return { earned: 0, pending: 0, available: 0 };
  const { supabase } = await requireUser();
  return trainerEarnings(supabase, profile.id);
}

export async function getMyCashouts() {
  const profile = await getMyTrainerProfile();
  if (!profile) return [];
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("trainer_cashout_requests")
    .select("id, amount, momo_network, momo_number, status, created_at")
    .eq("trainer_id", profile.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyTrainerBookings() {
  const profile = await getMyTrainerProfile();
  if (!profile) return [];
  const { supabase } = await requireUser();

  // Prefer the seq column; fall back if the migration hasn't been applied yet.
  // (Two static selects — Supabase parses the select string at compile time.)
  const withSeq = await supabase
    .from("trainer_bookings")
    .select("id, owner_id, status, sessions_total, gross_amount, created_at, trainer_sessions(id, seq, status, scheduled_at, release_amount)")
    .eq("trainer_id", profile.id)
    .order("created_at", { ascending: false });
  const noSeq = withSeq.error
    ? await supabase
        .from("trainer_bookings")
        .select("id, owner_id, status, sessions_total, gross_amount, created_at, trainer_sessions(id, status, scheduled_at, release_amount)")
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false })
    : null;
  const bookings = (withSeq.error ? noSeq!.data : withSeq.data) as
    | { id: string; owner_id: string; status: string; sessions_total: number; gross_amount: number; created_at: string; trainer_sessions: unknown }[]
    | null;
  if (!bookings || bookings.length === 0) return [];

  const ownerIds = [...new Set(bookings.map((b) => b.owner_id))];
  const { data: owners } = await supabase.from("users").select("id, name").in("id", ownerIds);
  const nameById = new Map((owners ?? []).map((o) => [o.id, o.name]));

  return bookings.map((b) => ({ ...b, ownerName: nameById.get(b.owner_id) ?? "An owner" }));
}
