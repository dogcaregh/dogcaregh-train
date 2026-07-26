// Pure trainer-earnings math, separated from the DB fetch so it can be unit
// tested. `trainerEarnings` (lib/trainer-data.ts) fetches the rows and calls this.

export type Earnings = { earned: number; pending: number; available: number; upcoming: number };

export type EarningsInput = {
  // One entry per booking, with its sessions' release amounts + whether released.
  bookings: { status: string; sessions: { release_amount: number; released_at: string | null }[] }[];
  // Payouts from completed, paid evaluations.
  evalPayouts: number[];
  // The trainer's cash-out requests.
  cashouts: { amount: number; status: string }[];
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * earned    — released session amounts + completed eval payouts (money banked).
 * upcoming  — not-yet-released session amounts on PAID programs (money coming).
 * reserved  — cash-outs already pending or paid (can't be withdrawn again).
 * available — earned − reserved.
 * pending   — cash-outs awaiting admin action.
 */
export function computeTrainerEarnings(input: EarningsInput): Earnings {
  let earned = 0;
  let upcoming = 0;
  for (const b of input.bookings) {
    const payable = !["pending", "cancelled"].includes(b.status);
    for (const s of b.sessions) {
      if (s.released_at) earned += Number(s.release_amount);
      else if (payable) upcoming += Number(s.release_amount);
    }
  }
  for (const p of input.evalPayouts) earned += Number(p);

  let reserved = 0;
  let pending = 0;
  for (const c of input.cashouts) {
    if (c.status === "pending" || c.status === "paid") reserved += Number(c.amount);
    if (c.status === "pending") pending += Number(c.amount);
  }

  return { earned: round(earned), pending: round(pending), available: round(earned - reserved), upcoming: round(upcoming) };
}
