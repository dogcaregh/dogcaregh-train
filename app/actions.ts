"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { programTotal, totalSessions } from "@/lib/pricing";

// Sign-out MUST be a POST action, never a GET route: a GET /logout can be
// prefetched by Next.js <Link>, hit by browsers/crawlers, etc., silently
// clearing the shared .dogcaregh.com session. A form POST can't be prefetched.
export async function signOutAction() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}

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

// ── Trainer side ─────────────────────────────────────────────

function splitList(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function myTrainerProfileId(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("trainer_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function saveTrainerProfile(formData: FormData) {
  const { supabase, user } = await authed();
  const evalFee = Math.max(300, Number(formData.get("eval_fee") || 300)); // DB floor is ₵300

  await supabase.from("trainer_profiles").upsert(
    {
      user_id: user.id,
      bio: String(formData.get("bio") ?? "").trim() || null,
      specialties: splitList(formData.get("specialties")),
      breeds: splitList(formData.get("breeds")),
      neighbourhoods: splitList(formData.get("neighbourhoods")),
      methods: String(formData.get("methods") ?? "").trim() || null,
      credentials: String(formData.get("credentials") ?? "").trim() || null,
      years_experience: formData.get("years_experience")
        ? Number(formData.get("years_experience"))
        : null,
      eval_fee: evalFee,
      // TODO: real vetting is admin-approved. Auto-verify in preview so the
      // trainer is discoverable end-to-end for testing.
      vetting_status: "verified",
      active: true,
    },
    { onConflict: "user_id" }
  );

  // One account can be both owner and trainer.
  await supabase.from("users").update({ is_trainer: true }).eq("id", user.id);

  revalidatePath("/trainer");
  redirect("/trainer");
}

export async function saveProgram(formData: FormData) {
  const { supabase, user } = await authed();
  const trainerId = await myTrainerProfileId(supabase, user.id);
  if (!trainerId) redirect("/trainer/profile");

  const programId = String(formData.get("program_id") ?? "") || null;
  const price = Number(formData.get("price") || 0);
  const row = {
    trainer_id: trainerId,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    weeks: Number(formData.get("weeks") || 1),
    sessions_per_week: Number(formData.get("sessions_per_week") || 1),
    price,
    discount: Math.min(Number(formData.get("discount") || 0), price), // DB: discount <= price
    active: true,
  };

  if (programId) {
    await supabase.from("trainer_programs").update(row).eq("id", programId);
  } else {
    await supabase.from("trainer_programs").insert(row);
  }

  revalidatePath("/trainer/programs");
  redirect("/trainer/programs");
}

export async function deleteProgram(formData: FormData) {
  const { supabase } = await authed();
  await supabase.from("trainer_programs").delete().eq("id", String(formData.get("program_id")));
  revalidatePath("/trainer/programs");
  redirect("/trainer/programs");
}

export async function scheduleEvaluation(formData: FormData) {
  const { supabase } = await authed();
  const when = String(formData.get("scheduled_at") ?? "").trim();
  await supabase
    .from("trainer_evaluations")
    .update({ status: "scheduled", scheduled_at: when ? new Date(when).toISOString() : null })
    .eq("id", String(formData.get("evaluation_id")));
  revalidatePath("/trainer/leads");
  redirect("/trainer/leads");
}

export async function sendRecommendation(formData: FormData) {
  const { supabase, user } = await authed();
  const trainerId = await myTrainerProfileId(supabase, user.id);
  if (!trainerId) redirect("/trainer/profile");

  const evaluationId = String(formData.get("evaluation_id"));
  const { data: evaluation } = await supabase
    .from("trainer_evaluations")
    .select("id, owner_id")
    .eq("id", evaluationId)
    .maybeSingle();
  if (!evaluation) redirect("/trainer/leads");

  const isCustom = String(formData.get("mode")) === "custom";
  let row: {
    name: string | null;
    sessions_per_week: number;
    weeks: number;
    price: number;
    discount: number;
    is_custom: boolean;
  };

  if (isCustom) {
    const price = Number(formData.get("price") || 0);
    row = {
      name: String(formData.get("name") ?? "").trim() || "Custom plan",
      sessions_per_week: Number(formData.get("sessions_per_week") || 1),
      weeks: Number(formData.get("weeks") || 1),
      price,
      discount: Math.min(Number(formData.get("discount") || 0), price),
      is_custom: true,
    };
  } else {
    const { data: program } = await supabase
      .from("trainer_programs")
      .select("name, sessions_per_week, weeks, price, discount")
      .eq("id", String(formData.get("program_id")))
      .maybeSingle();
    if (!program) redirect("/trainer/leads");
    row = {
      name: program.name,
      sessions_per_week: program.sessions_per_week,
      weeks: program.weeks,
      price: Number(program.price),
      discount: Number(program.discount),
      is_custom: false,
    };
  }

  await supabase.from("trainer_recommendations").insert({
    evaluation_id: evaluationId,
    owner_id: evaluation.owner_id,
    trainer_id: trainerId,
    status: "sent",
    note: String(formData.get("note") ?? "").trim() || null,
    ...row,
  });

  await supabase.from("trainer_evaluations").update({ status: "completed" }).eq("id", evaluationId);

  revalidatePath("/trainer/leads");
  redirect("/trainer/leads?sent=1");
}

export async function markSessionComplete(formData: FormData) {
  const { supabase } = await authed();
  await supabase
    .from("trainer_sessions")
    .update({ status: "completed", released_at: new Date().toISOString() })
    .eq("id", String(formData.get("session_id")));
  revalidatePath("/trainer/bookings");
  redirect("/trainer/bookings");
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
