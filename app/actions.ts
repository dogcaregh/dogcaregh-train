"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { completedBookingExists } from "@/lib/owner-data";
import { trainerEarnings } from "@/lib/trainer-data";
import { programTotal, totalSessions, splitAmount, perSessionRelease, multiDogTotal, cedis } from "@/lib/pricing";
import { paystackEnabled, initTransaction, stubCheckoutAllowed } from "@/lib/paystack";
import { notify } from "@/lib/notify";

export async function markAllNotificationsRead() {
  const { supabase, user } = await authed();
  await supabase.from("trainer_notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  // Refresh the bell/dropdown wherever it's shown, without navigating away.
  revalidatePath("/", "layout");
}

/** Mark one notification read (on click). Scoped to the caller's own rows. */
export async function markNotificationRead(id: string) {
  const { supabase, user } = await authed();
  await supabase.from("trainer_notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
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

// Form state for useActionState — an error message keeps the user on the form
// with an inline message (and their typed values) instead of a blind redirect.
export type DogFormState = {
  error?: string;
  values?: { name: string; breed: string; age: string; size: string; temperament: string; vaccination_status: boolean };
} | null;

export async function addDog(_prev: DogFormState, formData: FormData): Promise<DogFormState> {
  const { supabase, user } = await authed();
  const echo = {
    name: String(formData.get("name") ?? "").trim(),
    breed: String(formData.get("breed") ?? ""),
    age: String(formData.get("age") ?? ""),
    size: String(formData.get("size") ?? ""),
    temperament: String(formData.get("temperament") ?? ""),
    vaccination_status: formData.get("vaccination_status") === "on",
  };
  if (!echo.name) return { error: "Please enter your dog's name.", values: echo };

  const { data: dog, error } = await supabase
    .from("dogs")
    .insert({
      owner_id: user.id,
      name: echo.name,
      breed: echo.breed.trim() || null,
      age: echo.age ? Number(echo.age) : null,
      size: echo.size.trim() || null,
      temperament: echo.temperament.trim() || null,
      vaccination_status: echo.vaccination_status,
    })
    .select("id")
    .single();

  if (error || !dog) return { error: "Couldn't add your dog — please try again.", values: echo };

  // If the owner has no primary dog on their training profile yet, set this one.
  const { data: profile } = await supabase
    .from("trainer_owner_profiles")
    .select("user_id, dog_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile && !profile.dog_id) {
    await supabase.from("trainer_owner_profiles").update({ dog_id: dog.id }).eq("user_id", user.id);
  }

  revalidatePath("/dogs");
  // Continue the flow if we came from one; otherwise land back with a success note.
  const next = String(formData.get("next") || "/dogs");
  redirect(next === "/dogs" ? "/dogs?added=1" : next);
}

export async function updateDog(_prev: DogFormState, formData: FormData): Promise<DogFormState> {
  const { supabase, user } = await authed();
  const id = String(formData.get("dog_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Please enter your dog's name." };
  const breed = String(formData.get("breed") ?? "").trim() || null;

  const { error } = await supabase
    .from("dogs")
    .update({
      name,
      breed,
      age: formData.get("age") ? Number(formData.get("age")) : null,
      size: String(formData.get("size") ?? "").trim() || null,
      temperament: String(formData.get("temperament") ?? "").trim() || null,
      vaccination_status: formData.get("vaccination_status") === "on",
    })
    .eq("id", id)
    .eq("owner_id", user.id); // ownership guard — can't edit someone else's dog
  if (error) return { error: "Couldn't save your changes — please try again." };

  // Keep the denormalised name/breed on the owner profile fresh (ranking signal).
  await supabase
    .from("trainer_owner_profiles")
    .update({ dog_name: name, dog_breed: breed })
    .eq("user_id", user.id)
    .eq("dog_id", id);

  revalidatePath("/dogs");
  redirect("/dogs?updated=1");
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
 * Dogs for this booking: the ones picked in the form that belong to the owner
 * (order preserved, de-duped), else the onboarding default as a single-dog
 * fallback. Ownership is re-checked server-side so a forged dog id can't attach
 * someone else's dog. Returns [] when the owner has no usable dog.
 */
async function resolveDogIds(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  userId: string,
  picked: FormDataEntryValue[]
): Promise<string[]> {
  const candidates = [...new Set(picked.map((p) => String(p ?? "").trim()).filter(Boolean))];
  if (candidates.length) {
    const { data } = await supabase.from("dogs").select("id").eq("owner_id", userId).in("id", candidates);
    const owned = new Set((data ?? []).map((d) => d.id));
    const valid = candidates.filter((id) => owned.has(id)); // keep the picked order
    if (valid.length) return valid;
  }
  const fallback = await ownerDogId(supabase, userId);
  return fallback ? [fallback] : [];
}

/** The trainer's multi-dog discount %. 0 if unset or the column isn't there yet. */
async function trainerMultiDogDiscount(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  trainerProfileId: string
): Promise<number> {
  const { data } = await supabase
    .from("trainer_profiles")
    .select("multi_dog_discount")
    .eq("id", trainerProfileId)
    .maybeSingle();
  return data?.multi_dog_discount != null ? Number(data.multi_dog_discount) : 0;
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

  // One evaluation can cover several dogs at a single fee. Ownership re-checked;
  // the first dog is kept in dog_id (primary) for backward-compatible reads.
  const dogIds = await resolveDogIds(supabase, user.id, formData.getAll("dog_ids"));
  if (dogIds.length === 0) redirect(`/dogs?next=${encodeURIComponent(`/trainers/${trainerId}`)}`);

  const fee = Number(tp.eval_fee); // single fee regardless of how many dogs
  const { payout } = splitAmount(fee);
  const ev = await insertEvaluation(supabase, {
    owner_id: user.id,
    trainer_id: trainerId,
    program_id: programId,
    fee,
    trainer_payout: payout,
    status: "requested",
  }, dogIds);
  if (!ev) redirect("/trainers");

  const url = await beginCheckout("evaluation", ev.id, fee, user.email ?? "");
  if (url) redirect(url); // → Paystack; the callback marks it paid

  // No Paystack URL. Outside production we stub it paid so the flow stays
  // testable; in production we refuse rather than give away a free evaluation.
  if (!stubCheckoutAllowed()) redirect("/bookings?paid=unavailable");

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

  const dogIds = await resolveDogIds(supabase, user.id, formData.getAll("dog_ids"));
  if (dogIds.length === 0) redirect(`/dogs?next=${encodeURIComponent(`/trainers/${prog.trainer_id}`)}`);

  // Per-dog pricing with the trainer's multi-dog discount. Sessions are shared
  // (the dogs are trained together each visit), so the session count is unchanged.
  const perDog = programTotal(Number(prog.price), prog.sessions_per_week, prog.weeks, Number(prog.discount));
  const total = multiDogTotal(perDog, dogIds.length, await trainerMultiDogDiscount(supabase, prog.trainer_id));
  const count = totalSessions(prog.sessions_per_week, prog.weeks);

  const booking = await createBookingWithSessions(supabase, {
    ownerId: user.id,
    trainerId: prog.trainer_id,
    programId: prog.id,
    recommendationId: null,
    dogIds,
    sessionsTotal: count,
    gross: total,
  });
  if (!booking) redirect("/trainers");

  const url = await beginCheckout("booking", booking.id, booking.gross, user.email ?? "");
  if (url) redirect(url);
  if (!stubCheckoutAllowed()) redirect("/bookings?paid=unavailable");

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

  // The booking covers the same dog(s) the evaluation was about.
  const dogIds = await evaluationDogIds(supabase, rec.evaluation_id);

  // Per-dog pricing with the trainer's multi-dog discount; sessions are shared.
  const perDog = programTotal(Number(rec.price), rec.sessions_per_week, rec.weeks, Number(rec.discount));
  const total = multiDogTotal(perDog, Math.max(dogIds.length, 1), await trainerMultiDogDiscount(supabase, rec.trainer_id));
  const count = totalSessions(rec.sessions_per_week, rec.weeks);

  const booking = await createBookingWithSessions(supabase, {
    ownerId: user.id,
    trainerId: rec.trainer_id,
    programId: null,
    recommendationId: rec.id,
    dogIds,
    sessionsTotal: count,
    gross: total,
  });
  if (!booking) redirect("/recommendations");

  await supabase.from("trainer_recommendations").update({ status: "accepted" }).eq("id", rec.id);

  const url = await beginCheckout("booking", booking.id, booking.gross, user.email ?? "");
  if (url) redirect(url);
  if (!stubCheckoutAllowed()) redirect("/bookings?paid=unavailable");

  await markBookingPaidStub(supabase, booking.id);
  const acceptTrainerUid = await trainerUserId(supabase, rec.trainer_id);
  if (acceptTrainerUid) await notify(supabase, acceptTrainerUid, "booking_paid", "A program was booked and paid.", "/trainer/bookings", "New booking");
  revalidatePath("/bookings");
  redirect("/bookings?booked=recommendation");
}

/** Owner declines a recommendation (optionally with a reason). Frees the trainer
 *  to send a fresh one, and notifies them so they can act. */
export async function declineRecommendation(formData: FormData) {
  const { supabase, user } = await authed();
  const recId = String(formData.get("recommendation_id"));
  const reason = String(formData.get("reason") ?? "").trim();

  const { data: rec } = await supabase
    .from("trainer_recommendations")
    .select("id, trainer_id, owner_id, status")
    .eq("id", recId)
    .maybeSingle();
  if (!rec || rec.owner_id !== user.id || rec.status !== "sent") redirect("/recommendations");

  await supabase.from("trainer_recommendations").update({ status: "declined" }).eq("id", recId);

  const tuid = await trainerUserId(supabase, rec.trainer_id);
  if (tuid) {
    const msg = reason
      ? `An owner declined your recommendation: “${reason.slice(0, 200)}”`
      : "An owner declined your recommendation.";
    await notify(supabase, tuid, "recommendation_declined", msg, "/trainer/leads", "Recommendation declined");
  }

  revalidatePath("/recommendations");
  redirect("/recommendations?declined=1");
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
  const multiDogDiscount = Math.min(100, Math.max(0, Number(formData.get("multi_dog_discount") || 0)));

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
  // Columns added by later migrations, layered on top; if any isn't applied yet
  // the write is retried with just `base`.
  const full = {
    ...base,
    multi_dog_discount: multiDogDiscount,
    phone: String(formData.get("phone") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
  };

  // Provisioning: any signed-in user can apply to be a trainer — including an
  // existing DogCareGH owner. The vetting_status='pending' gate (admin approval
  // in /admin/trainers) is what controls discoverability, not the account's
  // origin. Nothing here makes a trainer visible without that approval.
  const existing = await myTrainerProfileId(supabase, user.id);
  if (existing) {
    const { error } = await supabase.from("trainer_profiles").update(full).eq("user_id", user.id);
    if (error) await supabase.from("trainer_profiles").update(base).eq("user_id", user.id);
  } else {
    const { error } = await supabase.from("trainer_profiles").insert({ ...full, vetting_status: "pending" });
    if (error) await supabase.from("trainer_profiles").insert({ ...base, vetting_status: "pending" });
    // Stamp this account as trainer-origin so trainer-facing UI treats it as one
    // (landing next-action, notifications nav). One account can be owner + trainer.
    if (user.user_metadata?.role !== "trainer") {
      await supabase.auth.updateUser({ data: { ...user.user_metadata, role: "trainer" } });
    }
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
  const reason = String(formData.get("reason") ?? "").trim();

  const trainerId = String(formData.get("trainer_id"));
  await supabase.from("trainer_profiles").update({ vetting_status: status }).eq("id", trainerId);

  if (status !== "pending") {
    const tuid = await trainerUserId(supabase, trainerId);
    const msg =
      status === "verified"
        ? "Your trainer profile was approved — you're now discoverable."
        : `Your trainer profile was rejected${reason ? `: ${reason}` : ""}.`;
    if (tuid) await notify(supabase, tuid, "vetting", msg, "/trainer", "Trainer vetting update");
  }

  revalidatePath("/admin/trainers");
  redirect("/admin/trainers");
}

/** Admin-only: pause/reactivate a trainer without changing their vetting status.
 *  A paused (active=false) trainer stops appearing in discovery. */
export async function setTrainerActive(formData: FormData) {
  const { supabase, user } = await authed();
  await assertAdmin(supabase, user.id);
  const trainerId = String(formData.get("trainer_id"));
  const active = formData.get("active") === "on";
  await supabase.from("trainer_profiles").update({ active }).eq("id", trainerId);

  const tuid = await trainerUserId(supabase, trainerId);
  if (tuid) {
    const msg = active
      ? "Your trainer profile is active again — you're discoverable to owners."
      : "Your trainer profile was paused by an admin — you won't appear to owners until it's reactivated.";
    await notify(supabase, tuid, "vetting", msg, "/trainer", "Trainer status update");
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
    description: string | null;
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
      description: String(formData.get("description") ?? "").trim() || null,
      sessions_per_week: Number(formData.get("sessions_per_week") || 1),
      weeks: Number(formData.get("weeks") || 1),
      price,
      discount: Math.min(Number(formData.get("discount") || 0), price),
      is_custom: true,
    };
  } else {
    const { data: program } = await supabase
      .from("trainer_programs")
      .select("name, description, sessions_per_week, weeks, price, discount")
      .eq("id", String(formData.get("program_id")))
      .maybeSingle();
    if (!program) redirect("/trainer/leads");
    row = {
      name: program.name,
      description: program.description ?? null,
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
  if (s && booking && !payable) {
    // Give the trainer a reason rather than a silent no-op.
    revalidatePath("/trainer/bookings");
    redirect("/trainer/bookings?err=unpaid");
  }
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

function fmtWhen(when: string): string {
  // Ghana is UTC+0, so server (UTC) formatting matches local time.
  return new Date(when).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/**
 * Auto-fill every session on a booking from a simple recurring pattern:
 * pick weekdays + a time + a start date, and we lay all sessions onto the next
 * matching days in order. Ghana is UTC+0, so we compute in UTC.
 */
export async function autoScheduleSessions(formData: FormData) {
  const { supabase, user } = await authed();
  const bookingId = String(formData.get("booking_id"));

  const { data: bk } = await supabase.from("trainer_bookings").select("owner_id, trainer_id").eq("id", bookingId).maybeSingle();
  if (!bk) redirect("/trainer/bookings");
  const myTid = await myTrainerProfileId(supabase, user.id);
  if (!myTid || myTid !== bk.trainer_id) redirect("/trainer/bookings"); // trainer-only

  const days = formData.getAll("days").map((d) => Number(d)).filter((d) => d >= 0 && d <= 6);
  const time = String(formData.get("time") || "09:00");
  const startStr = String(formData.get("start_date") || "").trim();
  if (!days.length || !startStr) redirect("/trainer/bookings");

  const { data: sessions } = await supabase
    .from("trainer_sessions").select("id").eq("booking_id", bookingId).order("created_at").order("id");
  const list = sessions ?? [];

  const [h, m] = time.split(":").map(Number);
  const dates: string[] = [];
  const cursor = new Date(`${startStr}T00:00:00.000Z`);
  let guard = 0;
  while (dates.length < list.length && guard < 400) {
    guard++;
    if (days.includes(cursor.getUTCDay())) {
      const dt = new Date(cursor);
      dt.setUTCHours(h || 0, m || 0, 0, 0);
      dates.push(dt.toISOString());
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (let i = 0; i < list.length && i < dates.length; i++) {
    await supabase.from("trainer_sessions").update({ scheduled_at: dates[i], reminder_sent: false }).eq("id", list[i].id);
  }

  if (dates[0]) {
    const when = new Date(dates[0]).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
    await notify(supabase, bk.owner_id, "sessions_scheduled", `Your ${list.length} sessions are scheduled — first on ${when}.`, "/bookings", "Sessions scheduled");
  }

  revalidatePath("/trainer/bookings");
  redirect("/trainer/bookings");
}

/** Trainer schedules (or reschedules) a single session's date/time. */
export async function scheduleSession(formData: FormData) {
  const { supabase } = await authed();
  const sessionId = String(formData.get("session_id"));
  const when = String(formData.get("scheduled_at") ?? "").trim();
  const iso = when ? new Date(when).toISOString() : null;

  await supabase.from("trainer_sessions").update({ scheduled_at: iso, reminder_sent: false }).eq("id", sessionId);

  if (iso) {
    const { data: s } = await supabase
      .from("trainer_sessions")
      .select("trainer_bookings(owner_id)")
      .eq("id", sessionId)
      .maybeSingle();
    const bk = s?.trainer_bookings as { owner_id: string } | { owner_id: string }[] | null;
    const ownerId = Array.isArray(bk) ? bk[0]?.owner_id : bk?.owner_id;
    if (ownerId) await notify(supabase, ownerId, "session_scheduled", `A training session was scheduled for ${fmtWhen(when)}.`, "/bookings");
  }

  revalidatePath("/trainer/bookings");
  redirect("/trainer/bookings");
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

/** Insert an evaluation, setting dog_id (primary) + dog_ids (full set). Falls
 *  back to dog_id-only if the dog_ids column isn't there yet. */
async function insertEvaluation(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  base: Record<string, unknown>,
  dogIds: string[]
): Promise<{ id: string } | null> {
  const row = { ...base, dog_id: dogIds[0] ?? null };
  const withDogs = await supabase.from("trainer_evaluations").insert({ ...row, dog_ids: dogIds }).select("id").single();
  if (!withDogs.error) return withDogs.data;
  const noDogs = await supabase.from("trainer_evaluations").insert(row).select("id").single();
  return noDogs.data ?? null;
}

/** All dog ids for an evaluation (dog_ids if present, else the single dog_id). */
async function evaluationDogIds(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  evaluationId: string
): Promise<string[]> {
  const full = await supabase.from("trainer_evaluations").select("dog_id, dog_ids").eq("id", evaluationId).maybeSingle();
  if (!full.error && full.data) {
    const ids = (full.data as { dog_ids?: string[] | null }).dog_ids;
    if (ids && ids.length) return ids;
    const one = (full.data as { dog_id?: string | null }).dog_id;
    return one ? [one] : [];
  }
  const base = await supabase.from("trainer_evaluations").select("dog_id").eq("id", evaluationId).maybeSingle();
  return base.data?.dog_id ? [base.data.dog_id] : [];
}

type BookingArgs = {
  ownerId: string;
  trainerId: string;
  programId: string | null;
  recommendationId: string | null;
  dogIds: string[];
  sessionsTotal: number;
  gross: number;
};

async function createBookingWithSessions(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  a: BookingArgs
): Promise<{ id: string; gross: number } | null> {
  const { commission, payout } = splitAmount(a.gross);
  const base = {
    owner_id: a.ownerId,
    trainer_id: a.trainerId,
    program_id: a.programId,
    recommendation_id: a.recommendationId,
    dog_id: a.dogIds[0] ?? null, // primary dog (backward-compatible reads)
    status: "pending", // moves to 'paid' after checkout (or stub)
    sessions_total: a.sessionsTotal,
    gross_amount: a.gross,
    commission_amount: commission,
    trainer_payout: payout,
  };
  // Set the full dog set; fall back to primary-only if dog_ids isn't there yet.
  let booking: { id: string } | null;
  const withDogs = await supabase.from("trainer_bookings").insert({ ...base, dog_ids: a.dogIds }).select("id").single();
  if (!withDogs.error) {
    booking = withDogs.data;
  } else {
    const noDogs = await supabase.from("trainer_bookings").insert(base).select("id").single();
    booking = noDogs.data ?? null;
  }

  if (!booking) return null;

  // release_amount is the trainer's NET per session (after 15% commission);
  // it accrues to the trainer's balance when the session is marked complete.
  const perSession = perSessionRelease(payout, a.sessionsTotal);
  const rows = Array.from({ length: a.sessionsTotal }, (_, i) => ({
    booking_id: booking.id,
    seq: i + 1, // fixed display order; never renumbered on schedule/complete
    status: "scheduled" as const,
    release_amount: perSession,
  }));
  const { error } = await supabase.from("trainer_sessions").insert(rows);
  // Fall back without seq if the migration hasn't been applied yet.
  if (error) {
    await supabase
      .from("trainer_sessions")
      .insert(rows.map((r) => ({ booking_id: r.booking_id, status: r.status, release_amount: r.release_amount })));
  }
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

/** True once an evaluation or booking exists between this owner and trainer —
 *  the gate that keeps messaging from being a cold-DM channel. */
async function messagingAllowed(
  supabase: Awaited<ReturnType<typeof authed>>["supabase"],
  ownerId: string,
  trainerId: string
): Promise<boolean> {
  const [{ count: evals }, { count: books }] = await Promise.all([
    supabase.from("trainer_evaluations").select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId).eq("trainer_id", trainerId),
    supabase.from("trainer_bookings").select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId).eq("trainer_id", trainerId),
  ]);
  return (evals ?? 0) > 0 || (books ?? 0) > 0;
}

/** Send a message in an owner↔trainer thread. The page supplies both party ids;
 *  the sender is always the current user. */
export async function sendMessage(formData: FormData) {
  const { supabase, user } = await authed();
  const ownerId = String(formData.get("owner_id") ?? "");
  const trainerId = String(formData.get("trainer_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const redirectTo = String(formData.get("redirect_to") ?? "/");
  if (!ownerId || !trainerId || !content) redirect(redirectTo);

  // Caller must be one of the two parties.
  const iAmOwner = user.id === ownerId;
  const myTrainer = await myTrainerProfileId(supabase, user.id);
  const iAmTrainer = myTrainer === trainerId;
  if (!iAmOwner && !iAmTrainer) redirect(redirectTo);

  // No cold DMs — an engagement must already exist between the two.
  if (!(await messagingAllowed(supabase, ownerId, trainerId))) redirect(redirectTo);

  await supabase.from("trainer_messages").insert({
    owner_id: ownerId,
    trainer_id: trainerId,
    sender_id: user.id,
    content: content.slice(0, 4000),
  });

  // Notify the other party.
  if (iAmOwner) {
    const tuid = await trainerUserId(supabase, trainerId);
    if (tuid) await notify(supabase, tuid, "message", "You have a new message from an owner.", `/trainer/messages/${ownerId}`, "New message");
  } else {
    await notify(supabase, ownerId, "message", "You have a new message from your trainer.", `/messages/${trainerId}`, "New message");
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}
