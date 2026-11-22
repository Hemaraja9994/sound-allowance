import { describe, expect, it } from "vitest";
import { allowedHours, fraction, level, weekFraction, type LogItem } from "./dose";

describe("allowance", () => {
  it("adult reference: 40 h at 80 dB, one tenth every 10 dB (≈halving per 3 dB)", () => {
    expect(allowedHours(80, "adult")).toBe(40);
    expect(allowedHours(90, "adult")).toBeCloseTo(4, 5);
    expect(allowedHours(83, "adult")).toBeCloseTo(20, 0);   // ~20 h (halving ≈ 3 dB)
  });
  it("child reference is stricter (75 dB)", () => expect(allowedHours(75, "child")).toBe(40));
  it("an hour at 100 dB is well over a day's allowance", () => expect(fraction(100, 60, "adult")).toBeGreaterThan(1));
});

describe("weekly dose", () => {
  const today = new Date().toISOString();
  it("sums fractions and flags over-allowance", () => {
    const log: LogItem[] = [{ id: "1", date: today, src: "x", db: 100, min: 24 }];
    expect(weekFraction(log, "adult")).toBeGreaterThan(0.9);
  });
  it("ignores entries older than 7 days", () => {
    const old = new Date(Date.now() - 10 * 864e5).toISOString();
    expect(weekFraction([{ id: "1", date: old, src: "x", db: 100, min: 600 }], "adult")).toBe(0);
  });
});

describe("level banding", () => {
  it("bands the fraction", () => { expect(level(0.5)).toBe("ok"); expect(level(0.8)).toBe("mid"); expect(level(1.2)).toBe("high"); });
});
