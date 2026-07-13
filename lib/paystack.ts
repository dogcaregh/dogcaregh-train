// Paystack integration for DogTrainerGH. Reuses DogCareGH's Paystack account
// (same PAYSTACK_SECRET_KEY) but confirms payments by verifying the
// transaction on our own callback rather than a webhook — so the care app's
// single Paystack webhook stays untouched. References are prefixed `dogtrain_`
// so trainer transactions are distinguishable in reconciliation.

const BASE = "https://api.paystack.co";

export function paystackEnabled(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
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
