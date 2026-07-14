"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { completedBookingExists } from "@/lib/owner-data";
import { trainerEarnings } from "@/lib/trainer-data";
import { programTotal, totalSessions, splitAmount, cedis } from "@/lib/pricing";
import { paystackEnabled, initTransaction } from "@/lib/paystack";
import { notify } from "@/lib/notify";

export async function markAllNotificationsRead() {
  const { supabase, user } = await authed();
  await supabase.from("trainer_notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  // Refresh the bell/dropdown wherever it's shown, without navigating away.
  revalidatePath("/", "layout");
}

/** users.id of the trainer behind a trainer_profiles.id (for notifications). */
async function trainerUserId(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  trainerProfileId: string
): Promise<string | null> {
  const { data } = await supabase.from("trainer_profiles").select("user_id").eq("id", trainerProfileId).maybeSingle();
  return data?.user_id ?? null;
}

// Start Paystack checkout for a record. Returns the hosted-checkout URL, or
// null when Paystack isn't configured yet (env-gated stub keeps the preview
// flow working until PAYSTACK_SECRET_KEY is set).
async function beginCheckout(
  kind: "evaluation" | "booking",
  recordId: string,
  amountGhs: number,
  email: string
): Promise<string | null> {
  if (!paystackEnabled()) return null;
  const host = headers().get("host");
  const base = host ? `https://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "https://train.dogcaregh.com";
  return initTransaction({
    email,
    amountGhs,
    reference: `dogtrain_${kind}_${recordId}_${Date.now()}`,
    callbackUrl: `${base}/payment/callback`,
    metadata: { kind, id: recordId },
  });
}

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

export async function addDog(formData: FormData) {
  const { supabase, user } = await authed();
  const { data: dog } = await supabase
    .from("dogs")
    .insert({
      owner_id: user.id,
      name: String(formData.get("name") ?? "").trim(),
      breed: String(formData.get("breed") ?? "").trim() || null,
      age: formData.get("age") ? Number(formData.get("age")) : null,
      size: String(formData.get("size") ?? "").trim() || null,
      temperament: String(formData.get("temperament") ?? "").trim() || null,
      vaccination_status: formData.get("vaccination_status") === "on",
    })
    .select("id")
    .single();

  // If the owner has no primary dog on their training profile yet, set this one.
  if (dog) {
    const { data: profile } = await supabase
      .from("trainer_owner_profiles")
      .select("user_id, dog_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile && !profile.dog_id) {
      await supabase.from("trainer_owner_profiles").update({ dog_id: dog.id }).eq("user_id", user.id);
    }
  }

  revalidatePath("/dogs");
  redirect(String(formData.get("next") || "/dogs"));
}

export async function saveOwnerProfile(formData: FormData) {
  const { supabase, user } = await authed();
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const budget = budgetRaw ? Number(budgetRaw) : null;

  const dogId = String(formData.get("dog_id") ?? "") || null;
  // Denormalise the chosen dog's name/breed onto the profile so matching stays
  // a simple read (breed is a ranking signal). The dog is the source of truth.
  let dogName: string | null = null;
  let dogBreed: string | null = null;
  if (dogId) {
    const { data: dog } = await supabase.from("dogs").select("name, breed").eq("id", dogId).maybeSingle();
    dogName = dog?.name ?? null;
    dogBreed = dog?.breed ?? null;
  }

  await supabase.from("trainer_owner_profiles").upsert(
    {
      user_id: user.id,
      dog_id: dogId,
      dog_name: dogName,
      dog_breed: dogBreed,
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

/** The onboarding "primary" dog, used as the default. */
async function ownerDogId(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("trainer_owner_profiles")
    .select("dog_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.dog_id ?? null;
}

/**
 * Dog for this booking: the one picked in the form if it belongs to the owner,
 * else the onboarding default. Ownership is re-checked server-side so a forged
 * dog_id can't attach someone else's dog.
 */
async function resolveDogId(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  userId: string,
  picked: FormDataEntryValue | null
): Promise<string | null> {
  const candidate = String(picked ?? "").trim();
  if (candidate) {
    const { data } = await supabase
      .from("dogs")
      .select("id")
      .eq("id", candidate)
      .eq("owner_id", userId)
      .maybeSingle();
    if (data) return data.id;
  }
  return ownerDogId(supabase, userId);
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

  // Bookings are per-dog. Use the picked dog (ownership re-checked) or default.
  const dogId = await resolveDogId(supabase, user.id, formData.get("dog_id"));
  if (!dogId) redirect(`/dogs?next=${encodeURIComponent(`/trainers/${trainerId}`)}`);

  const fee = Number(tp.eval_fee);
  const { payout } = splitAmount(fee);
  const { data: ev } = await supabase
    .from("trainer_evaluations")
    .insert({
      owner_id: user.id,
      trainer_id: trainerId,
      program_id: programId,
      dog_id: dogId,
      fee,
      trainer_payout: payout,
      status: "requested",
    })
    .select("id")
    .single();
  if (!ev) redirect("/trainers");

  const url = await beginCheckout("evaluation", ev.id, fee, user.email ?? "");
  if (url) redirect(url); // → Paystack; the callback marks it paid

  // No Paystack key yet → treat as paid so the flow stays testable.
  await supabase
    .from("trainer_evaluations")
    .update({ paid_at: new Date().toISOString(), payment_ref: `stub_${ev.id}` })
    .eq("id", ev.id);
  const evalTrainerUid = await trainerUserId(supabase, trainerId);
  if (evalTrainerUid) await notify(supabase, evalTrainerUid, "eval_paid", "New paid evaluation request.", "/trainer/leads", "New evaluation request");
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

  // Evaluation-first: direct rebooking is only for owners who've completed a
  // program with this trainer. Enforced here, not just via the disabled button.
  if (!(await completedBookingExists(supabase, user.id, prog.trainer_id))) {
    redirect(`/trainers/${prog.trainer_id}`);
  }

  const dogId = await resolveDogId(supabase, user.id, formData.get("dog_id"));
  if (!dogId) redirect(`/dogs?next=${encodeURIComponent(`/trainers/${prog.trainer_id}`)}`);

  const total = programTotal(Number(prog.price), prog.sessions_per_week, prog.weeks, Number(prog.discount));
  const count = totalSessions(prog.sessions_per_week, prog.weeks);

  const booking = await createBookingWithSessions(supabase, {
    ownerId: user.id,
    trainerId: prog.trainer_id,
    programId: prog.id,
    recommendationId: null,
    dogId,
    sessionsTotal: count,
    gross: total,
  });
  if (!booking) redirect("/trainers");

  const url = await beginCheckout("booking", booking.id, booking.gross, user.email ?? "");
  if (url) redirect(url);

  await markBookingPaidStub(supabase, booking.id);
  const rebookTrainerUid = await trainerUserId(supabase, prog.trainer_id);
  if (rebookTrainerUid) await notify(supabase, rebookTrainerUid, "booking_paid", "A program was booked and paid.", "/trainer/bookings", "New booking");
  revalidatePath("/bookings");
  redirect("/bookings?booked=program");
}

export async function acceptRecommendation(formData: FormData) {
  const { supabase, user } = await authed();
  const recId = String(formData.get("recommendation_id"));

  const { data: rec } = await supabase
    .from("trainer_recommendations")
    .select("id, trainer_id, evaluation_id, price, sessions_per_week, weeks, discount, status")
    .eq("id", recId)
    .maybeSingle();
  if (!rec || rec.status !== "sent") redirect("/recommendations");

  // The booking is for the same dog the evaluation was about.
  const { data: ev } = await supabase
    .from("trainer_evaluations")
    .select("dog_id")
    .eq("id", rec.evaluation_id)
    .maybeSingle();

  const total = programTotal(Number(rec.price), rec.sessions_per_week, rec.weeks, Number(rec.discount));
  const count = totalSessions(rec.sessions_per_week, rec.weeks);

  const booking = await createBookingWithSessions(supabase, {
    ownerId: user.id,
    trainerId: rec.trainer_id,
    programId: null,
    recommendationId: rec.id,
    dogId: ev?.dog_id ?? null,
    sessionsTotal: count,
    gross: total,
  });
  if (!booking) redirect("/recommendations");

  await supabase.from("trainer_recommendations").update({ status: "accepted" }).eq("id", rec.id);

  const url = await beginCheckout("booking", booking.id, booking.gross, user.email ?? "");
  if (url) redirect(url);

  await markBookingPaidStub(supabase, booking.id);
  const acceptTrainerUid = await trainerUserId(supabase, rec.trainer_id);
  if (acceptTrainerUid) await notify(supabase, acceptTrainerUid, "booking_paid", "A program was booked and paid.", "/trainer/bookings", "New booking");
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

  const base = {
    user_id: user.id,
    bio: String(formData.get("bio") ?? "").trim() || null,
    specialties: splitList(formData.get("specialties")),
    breeds: splitList(formData.get("breeds")),
    neighbourhoods: splitList(formData.get("neighbourhoods")),
    methods: String(formData.get("methods") ?? "").trim() || null,
    credentials: String(formData.get("credentials") ?? "").trim() || null,
    years_experience: formData.get("years_experience") ? Number(formData.get("years_experience")) : null,
    eval_fee: evalFee,
    active: true,
  };

  // Provisioning rule: trainer status is granted ONLY via direct sign-up on
  // the trainer app (/signup stamps user_metadata.role = 'trainer'). A
  // dogcaregh owner/provider account is never auto-promoted. Existing trainer
  // profiles are grandfathered (edits allowed); only CREATION is gated.
  const existing = await myTrainerProfileId(supabase, user.id);
  const trainerOrigin = user.user_metadata?.role === "trainer";
  if (existing) {
    await supabase.from("trainer_profiles").update(base).eq("user_id", user.id);
  } else if (trainerOrigin) {
    await supabase.from("trainer_profiles").insert({ ...base, vetting_status: "pending" });
  } else {
    redirect("/trainer"); // not a trainer account → blocked
  }

  // One account can be both owner and trainer.
  await supabase.from("users").update({ is_trainer: true }).eq("id", user.id);

  revalidatePath("/trainer");
  redirect("/trainer");
}

async function assertAdmin(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  userId: string
) {
  const { data: me } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  if (me?.role !== "admin") redirect("/");
}

const BOOKING_STATUSES = ["pending", "confirmed", "paid", "in_progress", "completed_pending", "closed", "cancelled"];

/** Admin: override a booking's status. */
export async function adminSetBookingStatus(formData: FormData) {
  const { supabase, user } = await authed();
  await assertAdmin(supabase, user.id);
  const status = String(formData.get("status"));
  if (!BOOKING_STATUSES.includes(status)) redirect("/admin/bookings");
  const bookingId = String(formData.get("booking_id"));
  await supabase.from("trainer_bookings").update({ status }).eq("id", bookingId);
  const { data: bk } = await supabase.from("trainer_bookings").select("owner_id, trainer_id").eq("id", bookingId).maybeSingle();
  if (bk) {
    const label = status.replace(/_/g, " ");
    await notify(supabase, bk.owner_id, "booking_updated", `An admin updated your booking status to "${label}".`, "/bookings");
    const tuid = await trainerUserId(supabase, bk.trainer_id);
    if (tuid) await notify(supabase, tuid, "booking_updated", `An admin updated a booking status to "${label}".`, "/trainer/bookings");
  }
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings");
}

/** Admin: flag/unflag a booking for a (manual) refund + note. */
export async function adminFlagRefund(formData: FormData) {
  const { supabase, user } = await authed();
  await assertAdmin(supabase, user.id);
  await supabase
    .from("trainer_bookings")
    .update({
      refund_flagged: formData.get("flag") === "on",
      admin_note: String(formData.get("admin_note") ?? "").trim() || null,
    })
    .eq("id", String(formData.get("booking_id")));
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings");
}

/** Admin: process a cash-out — mark paid (with reference) or rejected (with reason). */
export async function adminProcessCashout(formData: FormData) {
  const { supabase, user } = await authed();
  await assertAdmin(supabase, user.id);
  const action = String(formData.get("action"));
  if (action !== "paid" && action !== "rejected") redirect("/admin/cashouts");
  const cashoutId = String(formData.get("cashout_id"));
  const { data: co } = await supabase.from("trainer_cashout_requests").select("trainer_id, amount").eq("id", cashoutId).maybeSingle();
  await supabase
    .from("trainer_cashout_requests")
    .update({
      status: action,
      note: String(formData.get("note") ?? "").trim() || null,
      paid_at: action === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", cashoutId);
  if (co) {
    const tuid = await trainerUserId(supabase, co.trainer_id);
    if (tuid) await notify(supabase, tuid, "cashout_processed", `Your cash-out of ${cedis(Number(co.amount))} was ${action}.`, "/trainer/earnings", "Cash-out update");
  }
  revalidatePath("/admin/cashouts");
  redirect("/admin/cashouts");
}

/** Admin-only: set a trainer's vetting status. Role re-checked server-side. */
export async function setTrainerVetting(formData: FormData) {
  const { supabase, user } = await authed();
  await assertAdmin(supabase, user.id);

  const status = String(formData.get("status"));
  if (!["verified", "rejected", "pending"].includes(status)) redirect("/admin/trainers");

  const trainerId = String(formData.get("trainer_id"));
  await supabase.from("trainer_profiles").update({ vetting_status: status }).eq("id", trainerId);

  if (status !== "pending") {
    const tuid = await trainerUserId(supabase, trainerId);
    if (tuid) await notify(supabase, tuid, "vetting", `Your trainer profile was ${status === "verified" ? "approved — you're now discoverable" : "rejected"}.`, "/trainer", "Trainer vetting update");
  }

  revalidatePath("/admin/trainers");
  redirect("/admin/trainers");
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
  const evaluationId = String(formData.get("evaluation_id"));
  const when = String(formData.get("scheduled_at") ?? "").trim();
  await supabase
    .from("trainer_evaluations")
    .update({ status: "scheduled", scheduled_at: when ? new Date(when).toISOString() : null })
    .eq("id", evaluationId);
  const { data: ev } = await supabase.from("trainer_evaluations").select("owner_id").eq("id", evaluationId).maybeSingle();
  if (ev?.owner_id) await notify(supabase, ev.owner_id, "eval_scheduled", "Your evaluation has been scheduled.", "/bookings");
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

  await notify(supabase, evaluation.owner_id, "recommendation_sent", "You have a new program recommendation to review.", "/recommendations", "New program recommendation");

  revalidatePath("/trainer/leads");
  redirect("/trainer/leads?sent=1");
}

export async function markSessionComplete(formData: FormData) {
  const { supabase } = await authed();
  const sessionId = String(formData.get("session_id"));

  const { data: s } = await supabase
    .from("trainer_sessions")
    .select("id, booking_id, trainer_bookings(owner_id, trainer_id, status, sessions_total)")
    .eq("id", sessionId)
    .maybeSingle();
  type Bk = { owner_id: string; trainer_id: string; status: string; sessions_total: number };
  const bk = s?.trainer_bookings as Bk | Bk[] | null;
  const booking = Array.isArray(bk) ? bk[0] : bk;
  // Escrow: only release a session once the program is actually paid.
  const payable = booking && !["pending", "cancelled"].includes(booking.status);
  if (s && booking && payable) {
    await supabase
      .from("trainer_sessions")
      .update({ status: "completed", released_at: new Date().toISOString() })
      .eq("id", sessionId);

    const { data: sessions } = await supabase
      .from("trainer_sessions")
      .select("status")
      .eq("booking_id", s.booking_id);
    const done = (sessions ?? []).filter((x) => x.status === "completed").length;
    const closed = done >= booking.sessions_total;
    if (closed) await supabase.from("trainer_bookings").update({ status: "closed" }).eq("id", s.booking_id);

    if (closed) {
      await notify(supabase, booking.owner_id, "program_complete", "Your training program is complete 🎉 — leave a review!", "/bookings", "Program complete");
      const tuid = await trainerUserId(supabase, booking.trainer_id);
      if (tuid) await notify(supabase, tuid, "program_complete", "A program was completed.", "/trainer/bookings");
    } else {
      await notify(supabase, booking.owner_id, "session_completed", `A session was marked complete (${done}/${booking.sessions_total}).`, "/bookings");
    }
  }

  revalidatePath("/trainer/bookings");
  redirect("/trainer/bookings");
}

export async function submitReview(formData: FormData) {
  const { supabase, user } = await authed();
  const bookingId = String(formData.get("booking_id"));
  const rating = Math.max(1, Math.min(5, Number(formData.get("rating") || 0)));

  // Confirm the booking is the owner's and completed (RLS also enforces this).
  const { data: booking } = await supabase
    .from("trainer_bookings")
    .select("id, trainer_id, status")
    .eq("id", bookingId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!booking || booking.status !== "closed") redirect("/bookings");

  await supabase.from("trainer_reviews").insert({
    booking_id: bookingId,
    owner_id: user.id,
    trainer_id: booking.trainer_id,
    rating,
    text: String(formData.get("text") ?? "").trim() || null,
  });

  revalidatePath("/bookings");
  redirect("/bookings?reviewed=1");
}

export async function requestCashout(formData: FormData) {
  const { supabase, user } = await authed();
  const trainerId = await myTrainerProfileId(supabase, user.id);
  if (!trainerId) redirect("/trainer/profile");

  const amount = Number(formData.get("amount") || 0);
  const { available } = await trainerEarnings(supabase, trainerId);
  if (amount <= 0 || amount > available) redirect("/trainer/earnings?err=amount");

  await supabase.from("trainer_cashout_requests").insert({
    trainer_id: trainerId,
    amount,
    momo_network: String(formData.get("momo_network") ?? "").trim(),
    momo_number: String(formData.get("momo_number") ?? "").trim(),
  });
  revalidatePath("/trainer/earnings");
  redirect("/trainer/earnings?requested=1");
}

type BookingArgs = {
  ownerId: string;
  trainerId: string;
  programId: string | null;
  recommendationId: string | null;
  dogId: string | null;
  sessionsTotal: number;
  gross: number;
};

async function createBookingWithSessions(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  a: BookingArgs
): Promise<{ id: string; gross: number } | null> {
  const { commission, payout } = splitAmount(a.gross);
  const { data: booking } = await supabase
    .from("trainer_bookings")
    .insert({
      owner_id: a.ownerId,
      trainer_id: a.trainerId,
      program_id: a.programId,
      recommendation_id: a.recommendationId,
      dog_id: a.dogId,
      status: "pending", // moves to 'paid' after checkout (or stub)
      sessions_total: a.sessionsTotal,
      gross_amount: a.gross,
      commission_amount: commission,
      trainer_payout: payout,
    })
    .select("id")
    .single();

  if (!booking) return null;

  // release_amount is the trainer's NET per session (after 15% commission);
  // it accrues to the trainer's balance when the session is marked complete.
  const perSession = Math.round((payout / Math.max(a.sessionsTotal, 1)) * 100) / 100;
  const rows = Array.from({ length: a.sessionsTotal }, () => ({
    booking_id: booking.id,
    status: "scheduled" as const,
    release_amount: perSession,
  }));
  await supabase.from("trainer_sessions").insert(rows);
  return { id: booking.id, gross: a.gross };
}

/** Mark a booking paid without Paystack (env-gated stub). */
async function markBookingPaidStub(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  bookingId: string
) {
  await supabase
    .from("trainer_bookings")
    .update({ status: "paid", paid_at: new Date().toISOString(), payment_ref: `stub_${bookingId}` })
    .eq("id", bookingId);
}
