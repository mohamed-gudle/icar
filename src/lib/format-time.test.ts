import { describe, it, expect } from "vitest";
import { formatRemaining } from "./format-time";

describe("formatRemaining", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatRemaining(720_000)).toBe("12:00");
    expect(formatRemaining(61_000)).toBe("1:01");
    expect(formatRemaining(9_000)).toBe("0:09");
  });

  it("floors at zero and never goes negative", () => {
    expect(formatRemaining(0)).toBe("0:00");
    expect(formatRemaining(-5_000)).toBe("0:00");
  });

  it("rounds up partial seconds so the clock never shows 0 while time remains", () => {
    expect(formatRemaining(500)).toBe("0:01");
  });
});
