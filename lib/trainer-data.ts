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
  multi_dog_discount: number;
  phone: string | null;
  region: string | null;
  location: string | null;
};

/** My trainer profile (or null if I haven't created one). Deduped per request. */
export const getMyTrainerProfile = cache(async (): Promise<TrainerProfile | null> => {
  const { supabase, user } = await requireUser();
  const BASE =
    "id, user_id, bio, specialties, breeds, neighbourhoods, methods, credentials, years_experience, eval_fee, vetting_status, active, rating_avg, review_count, avatar_url, gallery_photos";
  // Prefer the later-migration columns; fall back if they aren't applied yet.
  const withExtra = await supabase.from("trainer_profiles").select(BASE + ", multi_dog_discount, phone, region, location").eq("user_id", user.id).maybeSingle();
  const data = withExtra.error
    ? (await supabase.from("trainer_profiles").select(BASE).eq("user_id", user.id).maybeSingle()).data
    : withExtra.data;
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    ...(data as TrainerProfile),
    multi_dog_discount: Number((d.multi_dog_discount as number) ?? 0),
    phone: (d.phone as string | null) ?? null,
    region: (d.region as string | null) ?? null,
    location: (d.location as string | null) ?? null,
  };
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
  dogs: { name: string; breed: string | null }[];
  budget: number | null;
  neighbourhood: string | null;
  hasRecommendation: boolean;
  contactPhone: string | null;
  scheduleConfirmed: boolean;
};

type EvalRow = {
  id: string;
  owner_id: string;
  program_id: string | null;
  dog_id: string | null;
  dog_ids?: string[] | null;
  fee: number;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  contact_phone?: string | null;
  schedule_confirmed?: boolean | null;
};

/** Dog ids on an evaluation: the full set, or the single primary dog. */
function evalDogIds(e: EvalRow): string[] {
  if (e.dog_ids && e.dog_ids.length) return e.dog_ids;
  return e.dog_id ? [e.dog_id] : [];
}

/** Evaluation requests sent to me, enriched with the owner's intake. */
export async function getMyLeads(): Promise<Lead[]> {
  const profile = await getMyTrainerProfile();
  if (!profile) return [];
  const { supabase } = await requireUser();

  const BASE = "id, owner_id, program_id, dog_id, fee, status, scheduled_at, created_at";
  // Prefer dog_ids (multi-dog); fall back if the migration isn't applied yet.
  const withDogs = await supabase
    .from("trainer_evaluations")
    .select(BASE + ", dog_ids, contact_phone, schedule_confirmed")
    .eq("trainer_id", profile.id)
    .not("paid_at", "is", null) // only surface paid evaluations
    .order("created_at", { ascending: false });
  const evals = (withDogs.error
    ? (
        await supabase
          .from("trainer_evaluations")
          .select(BASE)
          .eq("trainer_id", profile.id)
          .not("paid_at", "is", null)
          .order("created_at", { ascending: false })
      ).data
    : withDogs.data) as EvalRow[] | null;
  if (!evals || evals.length === 0) return [];

  const ownerIds = [...new Set(evals.map((e) => e.owner_id))];
  const evalIds = evals.map((e) => e.id);
  const dogIds = [...new Set(evals.flatMap(evalDogIds))];

  const [{ data: owners }, { data: intakes }, { data: recos }, { data: dogRows }] = await Promise.all([
    supabase.from("users").select("id, name").in("id", ownerIds),
    supabase
      .from("trainer_owner_profiles")
      .select("user_id, goal, budget, neighbourhood")
      .in("user_id", ownerIds),
    supabase.from("trainer_recommendations").select("evaluation_id, status").in("evaluation_id", evalIds),
    dogIds.length
      ? supabase.from("dogs").select("id, name, breed").in("id", dogIds)
      : Promise.resolve({ data: [] as { id: string; name: string; breed: string | null }[] }),
  ]);

  const nameById = new Map((owners ?? []).map((o) => [o.id, o.name]));
  const intakeById = new Map((intakes ?? []).map((i) => [i.user_id, i]));
  // A declined recommendation frees the trainer to send a fresh one.
  const recoEvalIds = new Set((recos ?? []).filter((r) => r.status !== "declined").map((r) => r.evaluation_id));
  const dogById = new Map((dogRows ?? []).map((d) => [d.id, d]));

  return evals.map((e): Lead => {
    const intake = intakeById.get(e.owner_id);
    const dogs = evalDogIds(e)
      .map((id) => dogById.get(id))
      .filter(Boolean)
      .map((d) => ({ name: d!.name, breed: d!.breed }));
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
      dogs,
      budget: intake?.budget != null ? Number(intake.budget) : null,
      neighbourhood: intake?.neighbourhood ?? null,
      hasRecommendation: recoEvalIds.has(e.id),
      contactPhone: e.contact_phone ?? null,
      scheduleConfirmed: Boolean(e.schedule_confirmed),
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
