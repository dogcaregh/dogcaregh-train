// Program pricing. `price` is per session; `discount` is a percentage.
// (The prototype's builder is sessions/week × weeks × price/session, with a
// loyalty discount %.) Kept in one place so bookings and previews agree.
export function programTotal(
  pricePerSession: number,
  sessionsPerWeek: number,
  weeks: number,
  discountPct: number
): number {
  const gross = pricePerSession * sessionsPerWeek * weeks;
  const net = gross * (1 - (discountPct || 0) / 100);
  return Math.round(net * 100) / 100;
}

export function totalSessions(sessionsPerWeek: number, weeks: number): number {
  return sessionsPerWeek * weeks;
}

/**
 * Total for a service booked for multiple dogs: the per-dog program total
 * charged per dog, with the trainer's multi-dog discount applied once 2+ dogs
 * are booked. (Evaluations are a single flat fee and don't use this.)
 */
export function multiDogTotal(
  perDogTotal: number,
  numDogs: number,
  multiDogDiscountPct: number
): number {
  const n = Math.max(1, numDogs);
  const gross = perDogTotal * n;
  const net = n >= 2 ? gross * (1 - (multiDogDiscountPct || 0) / 100) : gross;
  return Math.round(net * 100) / 100;
}

export function cedis(n: number): string {
  return "₵" + n.toLocaleString("en-GH", { maximumFractionDigits: 2 });
}

/** Convert a cedi amount to integer pesewas — Paystack's unit, and what we
 *  verify a transaction's amount against. Centralised so init + verify agree. */
export function toPesewas(amountGhs: number): number {
  return Math.round(amountGhs * 100);
}

// Platform commission (Phase 4 decision): 15% on everything.
export const COMMISSION_RATE = 0.15;

/** Split a gross amount into platform commission + trainer payout (net). */
export function splitAmount(gross: number): { commission: number; payout: number } {
  const commission = Math.round(gross * COMMISSION_RATE * 100) / 100;
  const payout = Math.round((gross - commission) * 100) / 100;
  return { commission, payout };
}

/** Trainer's NET release per session — the payout split evenly across all
 *  sessions, accruing to their balance as each session is marked complete. */
export function perSessionRelease(payout: number, sessionsTotal: number): number {
  return Math.round((payout / Math.max(sessionsTotal, 1)) * 100) / 100;
}
