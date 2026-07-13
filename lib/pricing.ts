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

export function cedis(n: number): string {
  return "₵" + n.toLocaleString("en-GH", { maximumFractionDigits: 2 });
}

// Platform commission (Phase 4 decision): 15% on everything.
export const COMMISSION_RATE = 0.15;

/** Split a gross amount into platform commission + trainer payout (net). */
export function splitAmount(gross: number): { commission: number; payout: number } {
  const commission = Math.round(gross * COMMISSION_RATE * 100) / 100;
  const payout = Math.round((gross - commission) * 100) / 100;
  return { commission, payout };
}
