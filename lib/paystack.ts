// Paystack integration for DogTrainerGH. Reuses DogCareGH's Paystack account
// (same PAYSTACK_SECRET_KEY) but confirms payments by verifying the
// transaction on our own callback rather than a webhook — so the care app's
// single Paystack webhook stays untouched. References are prefixed `dogtrain_`
// so trainer transactions are distinguishable in reconciliation.

const BASE = "https://api.paystack.co";

export function paystackEnabled(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

// Stub checkout (auto-mark-paid when there's no Paystack key) is a preview/dev
// convenience ONLY. In production it must never run: a missing key would
// otherwise silently give away paid bookings. VERCEL_ENV is "production" only
// on the production deployment ("preview"/"development"/unset elsewhere), so
// preview deployments and localhost keep the testable stub.
export function stubCheckoutAllowed(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

/** Our references are prefixed so trainer transactions are distinguishable from
 *  the care app's on the shared Paystack account. */
export function isDogtrainRef(ref: unknown): boolean {
  return typeof ref === "string" && ref.startsWith("dogtrain_");
}

/** Pull {kind, id} out of a transaction's metadata. Paystack returns metadata
 *  as an object, but can hand it back as a JSON string — handle both, and
 *  reject anything that isn't one of our two known kinds with a string id. */
export function parseTxMeta(metadata: unknown): { kind: "evaluation" | "booking"; id: string } | null {
  let m = metadata;
  if (typeof m === "string") {
    try {
      m = JSON.parse(m);
    } catch {
      return null;
    }
  }
  if (!m || typeof m !== "object") return null;
  const { kind, id } = m as { kind?: unknown; id?: unknown };
  if ((kind === "evaluation" || kind === "booking") && typeof id === "string" && id) {
    return { kind, id };
  }
  return null;
}

type InitArgs = {
  email: string;
  amountGhs: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
};

/** Initialize a transaction; returns the Paystack hosted-checkout URL. */
export async function initTransaction(a: InitArgs): Promise<string> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: a.email,
      amount: Math.round(a.amountGhs * 100), // pesewas
      currency: "GHS",
      reference: a.reference,
      callback_url: a.callbackUrl,
      metadata: a.metadata,
    }),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message ?? "Paystack initialize failed");
  return json.data.authorization_url as string;
}

export type Verified = {
  status: string; // "success" when paid
  amount: number; // pesewas
  reference: string;
  metadata: { kind?: string; id?: string } | null;
};

/** Verify a transaction by reference (authoritative check on the callback). */
export async function verifyTransaction(reference: string): Promise<Verified | null> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const json = await res.json();
  if (!json.status) return null;
  return json.data as Verified;
}

export type TxListItem = { reference: string; amount: number; status: string; metadata: unknown };

/**
 * List successful transactions since `fromIso` (paginated). Used by the
 * reconciliation cron to recover payments whose redirect callback was lost.
 * This returns the SHARED account's transactions (care app included) — callers
 * MUST filter with isDogtrainRef()/parseTxMeta() before acting on any of them.
 */
export async function listSuccessfulTransactions(fromIso: string): Promise<TxListItem[]> {
  const out: TxListItem[] = [];
  const perPage = 100;
  for (let page = 1; page <= 20; page++) {
    // Safety cap of 20 pages (2000 tx) so a busy shared account can't spin us.
    const res = await fetch(
      `${BASE}/transaction?status=success&perPage=${perPage}&page=${page}&from=${encodeURIComponent(fromIso)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const json = await res.json();
    if (!json.status || !Array.isArray(json.data)) break;
    for (const t of json.data) {
      out.push({ reference: String(t.reference), amount: Number(t.amount), status: String(t.status), metadata: t.metadata });
    }
    const pageCount = Number(json.meta?.pageCount ?? 1);
    if (json.data.length < perPage || page >= pageCount) break;
  }
  return out;
}
