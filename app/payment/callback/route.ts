import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyTransaction, parseTxMeta } from "@/lib/paystack";
import { applyVerifiedPayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Paystack redirects here after checkout. We VERIFY the transaction (instead of
// relying on a webhook — the care app owns the account's single webhook) and,
// if it succeeded and the amount matches, mark the evaluation/booking paid via
// the service role. Idempotent. The reconciliation cron is the backstop for
// when this redirect is lost (tab closed, network drop).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  if (!reference) return NextResponse.redirect(`${origin}/bookings`);

  const tx = await verifyTransaction(reference);
  if (!tx || tx.status !== "success") {
    return NextResponse.redirect(`${origin}/bookings?paid=failed`);
  }

  const meta = parseTxMeta(tx.metadata);
  if (!meta) return NextResponse.redirect(`${origin}/bookings`);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const result = await applyVerifiedPayment(admin, {
    kind: meta.kind,
    id: meta.id,
    reference,
    amount: tx.amount,
  });
  if (result === "mismatch") return NextResponse.redirect(`${origin}/bookings?paid=mismatch`);
  return NextResponse.redirect(`${origin}/bookings?paid=1`);
}
