import { describe, it, expect } from "vitest";
import { computeTrainerEarnings, type EarningsInput } from "./earnings";

const empty: EarningsInput = { bookings: [], evalPayouts: [], cashouts: [] };

describe("computeTrainerEarnings", () => {
  it("is all zeros with no data", () => {
    expect(computeTrainerEarnings(empty)).toEqual({ earned: 0, pending: 0, available: 0, upcoming: 0 });
  });

  it("counts released sessions as earned, unreleased on a paid program as upcoming", () => {
    const r = computeTrainerEarnings({
      bookings: [
        {
          status: "paid",
          sessions: [
            { release_amount: 85, released_at: "2026-01-01T00:00:00Z" }, // earned
            { release_amount: 85, released_at: null }, // upcoming
            { release_amount: 85, released_at: null }, // upcoming
          ],
        },
      ],
      evalPayouts: [],
      cashouts: [],
    });
    expect(r.earned).toBe(85);
    expect(r.upcoming).toBe(170);
    expect(r.available).toBe(85);
  });

  it("does NOT count unreleased sessions on pending/cancelled programs as upcoming", () => {
    const r = computeTrainerEarnings({
      bookings: [
        { status: "pending", sessions: [{ release_amount: 50, released_at: null }] },
        { status: "cancelled", sessions: [{ release_amount: 50, released_at: null }] },
      ],
      evalPayouts: [],
      cashouts: [],
    });
    expect(r.upcoming).toBe(0);
    expect(r.earned).toBe(0);
  });

  it("still counts released sessions on a since-cancelled program as earned", () => {
    // A session already released stays earned regardless of the booking's status.
    const r = computeTrainerEarnings({
      bookings: [{ status: "cancelled", sessions: [{ release_amount: 40, released_at: "2026-01-01T00:00:00Z" }] }],
      evalPayouts: [],
      cashouts: [],
    });
    expect(r.earned).toBe(40);
    expect(r.upcoming).toBe(0);
  });

  it("adds completed eval payouts to earned", () => {
    const r = computeTrainerEarnings({ bookings: [], evalPayouts: [255, 340], cashouts: [] });
    expect(r.earned).toBe(595);
    expect(r.available).toBe(595);
  });

  it("reserves pending + paid cash-outs against available; only pending is 'pending'", () => {
    const r = computeTrainerEarnings({
      bookings: [{ status: "closed", sessions: [{ release_amount: 1000, released_at: "2026-01-01T00:00:00Z" }] }],
      evalPayouts: [],
      cashouts: [
        { amount: 200, status: "paid" }, // reserved, not pending
        { amount: 150, status: "pending" }, // reserved + pending
        { amount: 999, status: "rejected" }, // neither
      ],
    });
    expect(r.earned).toBe(1000);
    expect(r.pending).toBe(150);
    expect(r.available).toBe(650); // 1000 − (200 + 150)
  });

  it("available can go negative if reserved exceeds earned (not clamped)", () => {
    const r = computeTrainerEarnings({
      bookings: [{ status: "closed", sessions: [{ release_amount: 100, released_at: "2026-01-01T00:00:00Z" }] }],
      evalPayouts: [],
      cashouts: [{ amount: 120, status: "paid" }],
    });
    expect(r.available).toBe(-20);
  });

  it("rounds every figure to 2 decimals", () => {
    const r = computeTrainerEarnings({
      bookings: [
        { status: "paid", sessions: [{ release_amount: 33.33, released_at: "x" }, { release_amount: 33.33, released_at: null }] },
      ],
      evalPayouts: [33.34],
      cashouts: [{ amount: 6.67, status: "pending" }],
    });
    expect(r.earned).toBe(66.67); // 33.33 + 33.34
    expect(r.upcoming).toBe(33.33);
    expect(r.pending).toBe(6.67);
    expect(r.available).toBe(60); // 66.67 − 6.67
  });

  it("end-to-end: earned − reserved, with upcoming tracked separately", () => {
    const r = computeTrainerEarnings({
      bookings: [
        {
          status: "paid",
          sessions: [
            { release_amount: 127.5, released_at: "x" },
            { release_amount: 127.5, released_at: "x" },
            { release_amount: 127.5, released_at: null },
          ],
        },
      ],
      evalPayouts: [340],
      cashouts: [{ amount: 300, status: "pending" }],
    });
    expect(r.earned).toBe(595); // 127.5 + 127.5 + 340
    expect(r.upcoming).toBe(127.5);
    expect(r.pending).toBe(300);
    expect(r.available).toBe(295); // 595 − 300
  });
});
