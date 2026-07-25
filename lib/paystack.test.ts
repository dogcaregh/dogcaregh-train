import { describe, it, expect, afterEach } from "vitest";
import { isDogtrainRef, parseTxMeta, stubCheckoutAllowed } from "./paystack";

describe("isDogtrainRef", () => {
  it("matches only our prefixed references (keeps us off the care app's txns)", () => {
    expect(isDogtrainRef("dogtrain_booking_abc_123")).toBe(true);
    expect(isDogtrainRef("dogtrain_evaluation_x_1")).toBe(true);
    expect(isDogtrainRef("care_booking_123")).toBe(false);
    expect(isDogtrainRef("dogcare_abc")).toBe(false);
    expect(isDogtrainRef("")).toBe(false);
    expect(isDogtrainRef(null)).toBe(false);
    expect(isDogtrainRef(undefined)).toBe(false);
    expect(isDogtrainRef(123)).toBe(false);
  });
});

describe("parseTxMeta", () => {
  it("reads kind + id from an object", () => {
    expect(parseTxMeta({ kind: "booking", id: "abc" })).toEqual({ kind: "booking", id: "abc" });
    expect(parseTxMeta({ kind: "evaluation", id: "e1" })).toEqual({ kind: "evaluation", id: "e1" });
  });

  it("parses a JSON string (Paystack sometimes stringifies metadata)", () => {
    expect(parseTxMeta(JSON.stringify({ kind: "booking", id: "abc" }))).toEqual({ kind: "booking", id: "abc" });
  });

  it("rejects unknown kinds, missing/non-string ids, and junk", () => {
    expect(parseTxMeta({ kind: "refund", id: "abc" })).toBeNull();
    expect(parseTxMeta({ kind: "booking" })).toBeNull();
    expect(parseTxMeta({ kind: "booking", id: 123 })).toBeNull();
    expect(parseTxMeta({ kind: "booking", id: "" })).toBeNull();
    expect(parseTxMeta(null)).toBeNull();
    expect(parseTxMeta("not json")).toBeNull();
    expect(parseTxMeta(42)).toBeNull();
  });
});

describe("stubCheckoutAllowed", () => {
  const original = process.env.VERCEL_ENV;
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original;
  });

  it("is BLOCKED in production (no silent free bookings)", () => {
    process.env.VERCEL_ENV = "production";
    expect(stubCheckoutAllowed()).toBe(false);
  });

  it("is allowed in preview and development", () => {
    process.env.VERCEL_ENV = "preview";
    expect(stubCheckoutAllowed()).toBe(true);
    process.env.VERCEL_ENV = "development";
    expect(stubCheckoutAllowed()).toBe(true);
  });

  it("is allowed locally (no VERCEL_ENV set)", () => {
    delete process.env.VERCEL_ENV;
    expect(stubCheckoutAllowed()).toBe(true);
  });
});
