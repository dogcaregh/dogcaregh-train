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
