import { describe, it, expect } from "vitest";
import { computeElapsedMs, remainingMs, isOverTime, isExpired } from "./timer";

const t0 = new Date("2026-06-07T00:00:00.000Z");
const at = (ms: number) => new Date(t0.getTime() + ms);
const DURATION = 720_000; // 12 min
const GRACE = 10_000;

describe("computeElapsedMs", () => {
  it("returns 0 for a null start", () => {
    expect(computeElapsedMs(null, at(5000))).toBe(0);
  });
  it("never goes negative", () => {
    expect(computeElapsedMs(t0, at(-5000))).toBe(0);
  });
  it("computes positive elapsed", () => {
    expect(computeElapsedMs(t0, at(30_000))).toBe(30_000);
  });
});

describe("remainingMs", () => {
  it("counts down and floors at 0", () => {
    expect(remainingMs(0, DURATION)).toBe(DURATION);
    expect(remainingMs(DURATION + 5000, DURATION)).toBe(0);
  });
});

describe("isOverTime", () => {
  it("is false within the limit and within grace", () => {
    expect(isOverTime(DURATION, DURATION, GRACE)).toBe(false);
    expect(isOverTime(DURATION + GRACE, DURATION, GRACE)).toBe(false);
  });
  it("is true beyond limit+grace", () => {
    expect(isOverTime(DURATION + GRACE + 1, DURATION, GRACE)).toBe(true);
  });
});

describe("isExpired", () => {
  it("is false for sessions still within limit+grace", () => {
    expect(isExpired(t0, at(DURATION), DURATION, GRACE)).toBe(false);
    expect(isExpired(t0, at(DURATION + GRACE), DURATION, GRACE)).toBe(false);
  });
  it("is true once past limit+grace", () => {
    expect(isExpired(t0, at(DURATION + GRACE + 1), DURATION, GRACE)).toBe(true);
  });
  it("is false when never started", () => {
    expect(isExpired(null, at(10_000_000), DURATION, GRACE)).toBe(false);
  });
});
