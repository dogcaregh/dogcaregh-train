import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listSuccessfulTransactions, isDogtrainRef, parseTxMeta } from "@/lib/paystack";
import { applyVerifiedPayment, type ApplyResult } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Backstop for lost payment redirects. Paystack can succeed while the browser
// redirect to /payment/callback is lost (tab closed, network drop) — the money
// is taken but the record stays unpaid (eval hidden from the trainer, booking
// stuck 'pending'). We can't use a webhook (the care app owns the account's
// single webhook), so we periodically re-verify recent successful transactions
// and apply any that never landed.
//
// Shared-account safety: the transaction list includes the care app's payments,
// so we act ONLY on `dogtrain_`-prefixed references carrying our {kind,id}
// metadata. Everything else is skipped, and writes only touch trainer_* tables.
// Secured by CRON_SECRET; no-ops without the Paystack + service-role keys.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ skipped: "missing keys" });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Re-check the last 2 days — a generous overlap so nothing slips between runs.
  // Applying is idempotent, so re-scanning already-applied payments is a no-op.
  const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const txns = await listSuccessfulTransactions(from);

  let recovered = 0;
  const counts: Partial<Record<ApplyResult, number>> = {};
  for (const t of txns) {
    if (t.status !== "success" || !isDogtrainRef(t.reference)) continue; // skip care-app + non-success
    const meta = parseTxMeta(t.metadata);
    if (!meta) continue;
    const result = await applyVerifiedPayment(admin, {
      kind: meta.kind,
      id: meta.id,
      reference: t.reference,
      amount: t.amount,
    });
    counts[result] = (counts[result] ?? 0) + 1;
    if (result === "applied") recovered++;
  }

  return NextResponse.json({ scanned: txns.length, recovered, counts });
}
