import type { SupabaseClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";

async function notifyTrainerByProfile(
  admin: SupabaseClient,
  trainerProfileId: string,
  type: string,
  message: string,
  link: string,
  subject: string
) {
  const { data } = await admin.from("trainer_profiles").select("user_id").eq("id", trainerProfileId).maybeSingle();
  if (data?.user_id) await notify(admin, data.user_id, type, message, link, subject);
}

export type ApplyResult = "applied" | "already" | "mismatch" | "notfound" | "invalid";

/**
 * Mark an evaluation/booking paid from a VERIFIED Paystack transaction. Shared
 * by the redirect callback and the reconciliation cron so they can't drift.
 *
 * Idempotent and race-safe: the paid_at/status guard lives in the UPDATE filter
 * (not just the prior read), so if the callback and the cron apply the same
 * payment concurrently, exactly one wins and only that one notifies.
 *
 * Only ever touches this app's trainer_evaluations/trainer_bookings — never the
 * shared users/dogs tables or anything the care app owns. `amount` is in pesewas.
 */
export async function applyVerifiedPayment(
  admin: SupabaseClient,
  tx: { kind: "evaluation" | "booking"; id: string; reference: string; amount: number }
): Promise<ApplyResult> {
  if (tx.kind === "evaluation") {
    const { data: ev } = await admin
      .from("trainer_evaluations")
      .select("id, fee, paid_at, trainer_id")
      .eq("id", tx.id)
      .maybeSingle();
    if (!ev) return "notfound";
    if (ev.paid_at) return "already";
    if (tx.amount !== Math.round(Number(ev.fee) * 100)) return "mismatch";

    const { data: updated } = await admin
      .from("trainer_evaluations")
      .update({ paid_at: new Date().toISOString(), payment_ref: tx.reference })
      .eq("id", tx.id)
      .is("paid_at", null) // race guard: only if still unpaid
      .select("id");
    if (!updated || updated.length === 0) return "already";

    await notifyTrainerByProfile(admin, ev.trainer_id, "eval_paid", "New paid evaluation request.", "/trainer/leads", "New evaluation request");
    return "applied";
  }

  if (tx.kind === "booking") {
    const { data: bk } = await admin
      .from("trainer_bookings")
      .select("id, gross_amount, status, trainer_id")
      .eq("id", tx.id)
      .maybeSingle();
    if (!bk) return "notfound";
    if (bk.status !== "pending") return "already";
    if (tx.amount !== Math.round(Number(bk.gross_amount) * 100)) return "mismatch";

    const { data: updated } = await admin
      .from("trainer_bookings")
      .update({ status: "paid", paid_at: new Date().toISOString(), payment_ref: tx.reference })
      .eq("id", tx.id)
      .eq("status", "pending") // race guard: only if still pending
      .select("id");
    if (!updated || updated.length === 0) return "already";

    await notifyTrainerByProfile(admin, bk.trainer_id, "booking_paid", "A program was booked and paid.", "/trainer/bookings", "New booking");
    return "applied";
  }

  return "invalid";
}
