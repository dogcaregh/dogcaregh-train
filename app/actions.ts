"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { programTotal, totalSessions } from "@/lib/pricing";

async function authed() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return { supabase, user };
}

export async function saveOwnerProfile(formData: FormData) {
  const { supabase, user } = await authed();
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const budget = budgetRaw ? Number(budgetRaw) : null;

  await supabase.from("trainer_owner_profiles").upsert(
    {
      user_id: user.id,
      dog_name: String(formData.get("dog_name") ?? "").trim() || null,
      dog_breed: String(formData.get("dog_breed") ?? "").trim() || null,
      goal: String(formData.get("goal") ?? "").trim() || null,
      budget: budget != null && !Number.isNaN(budget) ? budget : null,
      schedule: String(formData.get("schedule") ?? "").trim() || null,
      neighbourhood: String(formData.get("neighbourhood") ?? "").trim() || null,
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/trainers");
  redirect("/trainers");
}

export async function bookEvaluation(formData: FormData) {
  const { supabase, user } = await authed();
  const trainerId = String(formData.get("trainer_id"));
  const programId = String(formData.get("program_id") ?? "") || null;

  const { data: tp } = await supabase
    .from("trainer_profiles")
    .select("eval_fee")
    .eq("id", trainerId)
    .maybeSingle();
  if (!tp) redirect("/trainers");

  // Payment is Phase 4 — the evaluation is created as 'requested' (unpaid).
  await supabase.from("trainer_evaluations").insert({
    owner_id: user.id,
    trainer_id: trainerId,
    program_id: programId,
    fee: Number(tp.eval_fee),
    status: "requested",
  });

  revalidatePath("/bookings");
  redirect("/bookings?booked=eval");
}

// Direct program booking = the returning-owner "rebook without a fresh
// evaluation" path (brief §5). For this preview it is enabled generally so
// the booking/sessions UI is testable before the trainer journey exists;
// the evaluation-first gate will be enforced once trainers can complete
// evaluations (sub-step 3).
export async function rebookProgram(formData: FormData) {
  const { supabase, user } = await authed();
  const programId = String(formData.get("program_id"));

  const { data: prog } = await supabase
    .from("trainer_programs")
    .select("id, trainer_id, price, sessions_per_week, weeks, discount")
    .eq("id", programId)
    .maybeSingle();
  if (!prog) redirect("/trainers");

  const total = programTotal(Number(prog.price), prog.sessions_per_week, prog.weeks, Number(prog.discount));
  const count = totalSessions(prog.sessions_per_week, prog.weeks);

  await createBookingWithSessions(supabase, {
    ownerId: user.id,
    trainerId: prog.trainer_id,
    programId: prog.id,
    recommendationId: null,
    sessionsTotal: count,
    gross: total,
  });

  revalidatePath("/bookings");
  redirect("/bookings?booked=program");
}

export async function acceptRecommendation(formData: FormData) {
  const { supabase, user } = await authed();
  const recId = String(formData.get("recommendation_id"));

  const { data: rec } = await supabase
    .from("trainer_recommendations")
    .select("id, trainer_id, price, sessions_per_week, weeks, discount, status")
    .eq("id", recId)
    .maybeSingle();
  if (!rec || rec.status !== "sent") redirect("/recommendations");

  const total = programTotal(Number(rec.price), rec.sessions_per_week, rec.weeks, Number(rec.discount));
  const count = totalSessions(rec.sessions_per_week, rec.weeks);

  await createBookingWithSessions(supabase, {
    ownerId: user.id,
    trainerId: rec.trainer_id,
    programId: null,
    recommendationId: rec.id,
    sessionsTotal: count,
    gross: total,
  });

  await supabase.from("trainer_recommendations").update({ status: "accepted" }).eq("id", rec.id);

  revalidatePath("/bookings");
  redirect("/bookings?booked=recommendation");
}

type BookingArgs = {
  ownerId: string;
  trainerId: string;
  programId: string | null;
  recommendationId: string | null;
  sessionsTotal: number;
  gross: number;
};

async function createBookingWithSessions(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  a: BookingArgs
) {
  const { data: booking } = await supabase
    .from("trainer_bookings")
    .insert({
      owner_id: a.ownerId,
      trainer_id: a.trainerId,
      program_id: a.programId,
      recommendation_id: a.recommendationId,
      status: "pending", // payment (Phase 4) will move this to 'paid'
      sessions_total: a.sessionsTotal,
      gross_amount: a.gross,
    })
    .select("id")
    .single();

  if (!booking) return;

  const perSession = Math.round((a.gross / Math.max(a.sessionsTotal, 1)) * 100) / 100;
  const rows = Array.from({ length: a.sessionsTotal }, () => ({
    booking_id: booking.id,
    status: "scheduled" as const,
    release_amount: perSession,
  }));
  await supabase.from("trainer_sessions").insert(rows);
}
