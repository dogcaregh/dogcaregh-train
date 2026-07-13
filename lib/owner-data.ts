import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type OwnerProfile = {
  user_id: string;
  dog_name: string | null;
  dog_breed: string | null;
  goal: string | null;
  budget: number | null;
  schedule: string | null;
  neighbourhood: string | null;
};

export type Program = {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  weeks: number;
  sessions_per_week: number;
  price: number;
  discount: number;
  is_custom: boolean;
};

export type Trainer = {
  id: string;
  user_id: string;
  name: string; // from users.name
  bio: string | null;
  specialties: string[];
  breeds: string[];
  neighbourhoods: string[];
  methods: string | null;
  credentials: string | null;
  years_experience: number | null;
  eval_fee: number;
  vetting_status: string;
  programs: Program[];
  fromPrice: number | null; // cheapest program price
  score: number; // match score for the current owner
};

/** Require a signed-in user; otherwise send them home to log in. */
export async function requireUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return { supabase, user };
}

export async function getMyOwnerProfile(): Promise<OwnerProfile | null> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("trainer_owner_profiles")
    .select("user_id, dog_name, dog_breed, goal, budget, schedule, neighbourhood")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as OwnerProfile) ?? null;
}

/** Transparent match score — higher is a better fit for this owner. */
function scoreTrainer(t: Omit<Trainer, "score">, p: OwnerProfile | null): number {
  if (!p) return 0;
  let s = 0;
  const area = (p.neighbourhood ?? "").trim().toLowerCase();
  if (area && t.neighbourhoods.some((n) => n.toLowerCase() === area)) s += 40;

  const breed = (p.dog_breed ?? "").trim().toLowerCase();
  if (
    breed &&
    t.breeds.some(
      (b) => b.toLowerCase() === breed || b.toLowerCase() === "all breeds"
    )
  )
    s += 30;

  const goal = (p.goal ?? "").trim().toLowerCase();
  if (goal && t.specialties.some((sp) => goal.includes(sp.toLowerCase()) || sp.toLowerCase().includes(goal)))
    s += 20;

  if (p.budget != null && t.fromPrice != null && t.fromPrice <= p.budget) s += 10;

  return s;
}

/** All active, vetted trainers with their programs, ranked best-fit first. */
export async function listRankedTrainers(): Promise<Trainer[]> {
  const { supabase } = await requireUser();
  const profile = await getMyOwnerProfile();

  const { data: profiles } = await supabase
    .from("trainer_profiles")
    .select(
      "id, user_id, bio, specialties, breeds, neighbourhoods, methods, credentials, years_experience, eval_fee, vetting_status, users(name)"
    )
    .eq("active", true)
    .eq("vetting_status", "verified");

  if (!profiles || profiles.length === 0) return [];

  const ids = profiles.map((p) => p.id);
  const { data: programs } = await supabase
    .from("trainer_programs")
    .select("id, trainer_id, name, description, weeks, sessions_per_week, price, discount, is_custom")
    .in("trainer_id", ids)
    .eq("active", true);

  const byTrainer = new Map<string, Program[]>();
  (programs ?? []).forEach((pr) => {
    const arr = byTrainer.get(pr.trainer_id) ?? [];
    arr.push(pr as Program);
    byTrainer.set(pr.trainer_id, arr);
  });

  const trainers = profiles.map((row): Trainer => {
    const progs = byTrainer.get(row.id) ?? [];
    const fromPrice = progs.length ? Math.min(...progs.map((p) => p.price)) : null;
    // Supabase returns the joined relation as an array or object depending on shape.
    const rel = row.users as unknown;
    const name =
      (Array.isArray(rel) ? rel[0]?.name : (rel as { name?: string } | null)?.name) ??
      "Trainer";
    const base = {
      id: row.id,
      user_id: row.user_id,
      name,
      bio: row.bio,
      specialties: row.specialties ?? [],
      breeds: row.breeds ?? [],
      neighbourhoods: row.neighbourhoods ?? [],
      methods: row.methods,
      credentials: row.credentials,
      years_experience: row.years_experience,
      eval_fee: Number(row.eval_fee),
      vetting_status: row.vetting_status,
      programs: progs.sort((a, b) => a.price - b.price),
      fromPrice,
    };
    return { ...base, score: scoreTrainer(base, profile) };
  });

  return trainers.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export async function getTrainer(id: string): Promise<Trainer | null> {
  const all = await listRankedTrainers();
  return all.find((t) => t.id === id) ?? null;
}

export type EvaluationRow = {
  id: string;
  trainer_id: string;
  program_id: string | null;
  fee: number;
  status: string;
  created_at: string;
  trainer_profiles: { users: { name: string } | { name: string }[] } | null;
};

export async function listMyEvaluations() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("trainer_evaluations")
    .select("id, trainer_id, program_id, fee, status, created_at, trainer_profiles(users(name))")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listMyRecommendations() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("trainer_recommendations")
    .select("id, trainer_id, name, is_custom, sessions_per_week, weeks, price, discount, note, status, created_at, trainer_profiles(users(name))")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listMyBookings() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("trainer_bookings")
    .select("id, trainer_id, status, sessions_total, gross_amount, created_at, trainer_profiles(users(name)), trainer_sessions(id, status, scheduled_at)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Small helper for the joined trainer name shape Supabase returns. */
export function relName(rel: unknown): string {
  if (!rel) return "Trainer";
  const users = (rel as { users?: unknown }).users ?? rel;
  if (Array.isArray(users)) return users[0]?.name ?? "Trainer";
  return (users as { name?: string })?.name ?? "Trainer";
}
