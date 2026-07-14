import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyTransaction } from "@/lib/paystack";
import { notify } from "@/lib/notify";

async function notifyTrainerByProfile(admin: SupabaseClient, trainerProfileId: string, type: string, message: string, link: string, subject: string) {
  const { data } = await admin.from("trainer_profiles").select("user_id").eq("id", trainerProfileId).maybeSingle();
  if (data?.user_id) await notify(admin, data.user_id, type, message, link, subject);
}

// Paystack redirects here after checkout. We VERIFY the transaction (instead of
// relying on a webhook — the care app owns the account's single webhook) and,
// if it succeeded and the amount matches, mark the evaluation/booking paid via
// the service role. Idempotent.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  if (!reference) return NextResponse.redirect(`${origin}/bookings`);

  const tx = await verifyTransaction(reference);
  if (!tx || tx.status !== "success") {
    return NextResponse.redirect(`${origin}/bookings?paid=failed`);
  }

  const kind = tx.metadata?.kind;
  const id = tx.metadata?.id;
  if (!id || (kind !== "evaluation" && kind !== "booking")) {
    return NextResponse.redirect(`${origin}/bookings`);
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (kind === "evaluation") {
    const { data: ev } = await admin
      .from("trainer_evaluations")
      .select("id, fee, paid_at, trainer_id")
      .eq("id", id)
      .single();
    if (!ev) return NextResponse.redirect(`${origin}/bookings`);
    if (!ev.paid_at) {
      if (tx.amount !== Math.round(Number(ev.fee) * 100)) {
        return NextResponse.redirect(`${origin}/bookings?paid=mismatch`);
      }
      await admin
        .from("trainer_evaluations")
        .update({ paid_at: new Date().toISOString(), payment_ref: reference })
        .eq("id", id);
      await notifyTrainerByProfile(admin, ev.trainer_id, "eval_paid", "New paid evaluation request.", "/trainer/leads", "New evaluation request");
    }
    return NextResponse.redirect(`${origin}/bookings?paid=1`);
  }

  const { data: bk } = await admin
    .from("trainer_bookings")
    .select("id, gross_amount, status, trainer_id")
    .eq("id", id)
    .single();
  if (!bk) return NextResponse.redirect(`${origin}/bookings`);
  if (bk.status === "pending") {
    if (tx.amount !== Math.round(Number(bk.gross_amount) * 100)) {
      return NextResponse.redirect(`${origin}/bookings?paid=mismatch`);
    }
    // trainer_payout/commission were set at booking creation.
    await admin
      .from("trainer_bookings")
      .update({ status: "paid", paid_at: new Date().toISOString(), payment_ref: reference })
      .eq("id", id);
    await notifyTrainerByProfile(admin, bk.trainer_id, "booking_paid", "A program was booked and paid.", "/trainer/bookings", "New booking");
  }
  return NextResponse.redirect(`${origin}/bookings?paid=1`);
}
