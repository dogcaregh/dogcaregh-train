import { describe, it, expect } from "vitest";
import {
  programTotal,
  totalSessions,
  splitAmount,
  perSessionRelease,
  multiDogTotal,
  cedis,
  toPesewas,
  COMMISSION_RATE,
} from "./pricing";

// Strip currency symbol + grouping separators so assertions don't depend on the
// exact en-GH ICU formatting (only that the numeric value round-trips).
const num = (s: string) => s.replace(/[^\d.]/g, "");

describe("programTotal", () => {
  it("multiplies price × sessions/week × weeks with no discount", () => {
    expect(programTotal(100, 2, 4, 0)).toBe(800);
    expect(programTotal(150, 3, 6, 0)).toBe(2700);
  });

  it("applies a percentage discount", () => {
    expect(programTotal(100, 2, 4, 10)).toBe(720); // 800 × 0.90
    expect(programTotal(150, 3, 6, 15)).toBe(2295); // 2700 × 0.85
    expect(programTotal(200, 1, 5, 50)).toBe(500); // 1000 × 0.50
  });

  it("treats a null/undefined discount as zero", () => {
    // discountPct is typed number, but callers pass Number(formData) which can
    // be NaN/0; the `|| 0` guard must hold.
    expect(programTotal(100, 1, 1, undefined as unknown as number)).toBe(100);
    expect(programTotal(100, 1, 1, NaN)).toBe(100);
  });

  it("rounds to 2 decimal places", () => {
    // 2700 × (1 - 12.5/100) = 2362.5 — exact 1dp, stays put
    expect(programTotal(150, 3, 6, 12.5)).toBe(2362.5);
    // 10 × 0.855 = 8.55
    expect(programTotal(10, 1, 1, 14.5)).toBe(8.55);
  });

  it("handles zero sessions or weeks as a zero total", () => {
    expect(programTotal(100, 0, 4, 0)).toBe(0);
    expect(programTotal(100, 2, 0, 0)).toBe(0);
  });
});

describe("totalSessions", () => {
  it("is sessions/week × weeks", () => {
    expect(totalSessions(2, 4)).toBe(8);
    expect(totalSessions(3, 6)).toBe(18);
    expect(totalSessions(1, 1)).toBe(1);
  });
});

describe("COMMISSION_RATE", () => {
  it("is the agreed 15% platform commission", () => {
    expect(COMMISSION_RATE).toBe(0.15);
  });
});

describe("splitAmount", () => {
  it("takes 15% commission and leaves the rest as trainer payout", () => {
    expect(splitAmount(1000)).toEqual({ commission: 150, payout: 850 });
    expect(splitAmount(100)).toEqual({ commission: 15, payout: 85 });
  });

  it("rounds commission and payout to 2 decimals", () => {
    // 99.99 × 0.15 = 14.9985 → 15.00; payout 84.99
    expect(splitAmount(99.99)).toEqual({ commission: 15, payout: 84.99 });
    // 33.33 × 0.15 = 4.9995 → 5.00; payout 28.33
    expect(splitAmount(33.33)).toEqual({ commission: 5, payout: 28.33 });
  });

  it("is exact for a zero amount", () => {
    expect(splitAmount(0)).toEqual({ commission: 0, payout: 0 });
  });

  it("never loses or invents money: commission + payout === gross", () => {
    for (const gross of [100, 99.99, 33.33, 2295, 720, 1, 12.34, 87.65, 500]) {
      const { commission, payout } = splitAmount(gross);
      expect(commission + payout).toBeCloseTo(gross, 2);
    }
  });
});

describe("perSessionRelease", () => {
  it("splits the payout evenly across sessions", () => {
    expect(perSessionRelease(850, 10)).toBe(85);
    expect(perSessionRelease(100, 4)).toBe(25);
  });

  it("rounds each session's release to 2 decimals", () => {
    expect(perSessionRelease(100, 3)).toBe(33.33); // 33.333… → 33.33
    expect(perSessionRelease(2295, 18)).toBe(127.5);
  });

  it("guards against divide-by-zero (0 sessions → whole payout)", () => {
    expect(perSessionRelease(100, 0)).toBe(100);
    expect(perSessionRelease(100, 1)).toBe(100);
  });

  it("may drift by a few pesewas vs the payout due to per-session rounding", () => {
    // 33.33 × 3 = 99.99, one pesewa short of 100 — documented, accepted behaviour.
    const per = perSessionRelease(100, 3);
    expect(per * 3).toBeCloseTo(99.99, 2);
    expect(per * 3).not.toBe(100);
  });
});

describe("multiDogTotal", () => {
  it("charges per dog", () => {
    expect(multiDogTotal(1000, 1, 0)).toBe(1000);
    expect(multiDogTotal(1000, 2, 0)).toBe(2000);
    expect(multiDogTotal(1000, 3, 0)).toBe(3000);
  });

  it("applies the multi-dog discount only at 2+ dogs", () => {
    expect(multiDogTotal(1000, 1, 10)).toBe(1000); // single dog: no discount even if set
    expect(multiDogTotal(1000, 2, 10)).toBe(1800); // 2000 × 0.90
    expect(multiDogTotal(1000, 3, 10)).toBe(2700); // 3000 × 0.90
    expect(multiDogTotal(2295, 2, 15)).toBe(3901.5); // 4590 × 0.85
  });

  it("treats a null/undefined discount as zero", () => {
    expect(multiDogTotal(1000, 2, undefined as unknown as number)).toBe(2000);
    expect(multiDogTotal(1000, 2, NaN)).toBe(2000);
  });

  it("guards a zero/negative dog count as a single dog (no discount)", () => {
    expect(multiDogTotal(1000, 0, 10)).toBe(1000);
    expect(multiDogTotal(1000, -3, 10)).toBe(1000);
  });

  it("rounds to 2 decimals", () => {
    expect(multiDogTotal(33.33, 2, 0)).toBe(66.66);
    expect(multiDogTotal(100, 2, 33)).toBe(134); // 200 × 0.67
  });
});

describe("end-to-end money path", () => {
  it("gross → split → per-session release stays consistent", () => {
    const gross = programTotal(150, 3, 6, 15); // 2295
    const sessions = totalSessions(3, 6); // 18
    const { commission, payout } = splitAmount(gross);

    expect(gross).toBe(2295);
    expect(sessions).toBe(18);
    expect(commission).toBe(344.25); // 2295 × 0.15
    expect(payout).toBe(1950.75); // 2295 − 344.25
    expect(perSessionRelease(payout, sessions)).toBe(108.38); // 1950.75 / 18 ≈ 108.375 → 108.38
  });
});

describe("toPesewas", () => {
  it("converts cedis to integer pesewas", () => {
    expect(toPesewas(100)).toBe(10000);
    expect(toPesewas(0.1)).toBe(10);
    expect(toPesewas(1234.56)).toBe(123456);
    expect(toPesewas(0)).toBe(0);
  });

  it("rounds floating-point cents cleanly (init and verify must agree)", () => {
    expect(toPesewas(99.99)).toBe(9999); // 99.99 * 100 = 9998.9999… → 9999
    expect(toPesewas(19.99)).toBe(1999);
    expect(toPesewas(2295)).toBe(229500);
    expect(toPesewas(84.99)).toBe(8499);
  });
});

describe("cedis", () => {
  it("prefixes the cedi sign and preserves the numeric value", () => {
    expect(num(cedis(50))).toBe("50");
    expect(num(cedis(1000))).toBe("1000");
    expect(num(cedis(2295))).toBe("2295");
    expect(num(cedis(1234.5))).toBe("1234.5");
  });

  it("caps at 2 decimal places", () => {
    expect(num(cedis(1234.567))).toBe("1234.57");
  });

  it("starts with the ₵ symbol", () => {
    expect(cedis(0).startsWith("₵")).toBe(true);
  });
});
