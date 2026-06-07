import { describe, it, expect } from "vitest";
import { aggregateProctoring } from "./proctoring";

describe("aggregateProctoring", () => {
  it("flags when any away event exists", () => {
    expect(aggregateProctoring([{ type: "blur" }]).flagged).toBe(true);
    expect(
      aggregateProctoring([{ type: "visibility_hidden", durationMs: 500 }])
        .flagged,
    ).toBe(true);
  });

  it("does not flag on returns/visible-only events", () => {
    const s = aggregateProctoring([
      { type: "visibility_visible", durationMs: 1000 },
    ]);
    expect(s.flagged).toBe(false);
    expect(s.awayEvents).toBe(0);
  });

  it("is not flagged for an empty event list", () => {
    expect(aggregateProctoring([]).flagged).toBe(false);
  });

  it("aggregates count, total, and longest away time", () => {
    const s = aggregateProctoring([
      { type: "blur", durationMs: 1000 },
      { type: "visibility_hidden", durationMs: 4000 },
      { type: "visibility_visible", durationMs: 9999 },
      { type: "blur" }, // missing duration counts as 0
    ]);
    expect(s.awayEvents).toBe(3);
    expect(s.totalAwayMs).toBe(5000);
    expect(s.longestAwayMs).toBe(4000);
    expect(s.flagged).toBe(true);
  });
});
