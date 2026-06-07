import { describe, it, expect } from "vitest";
import { formatDuration } from "./results";

describe("formatDuration", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatDuration(723_000)).toBe("12m 03s");
    expect(formatDuration(59_000)).toBe("0m 59s");
    expect(formatDuration(600_000)).toBe("10m 00s");
  });

  it("renders an em dash for null/undefined", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
  });

  it("never goes negative", () => {
    expect(formatDuration(-1000)).toBe("0m 00s");
  });
});
