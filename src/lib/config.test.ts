import { describe, it, expect } from "vitest";
import {
  TEST_DURATION_MS,
  TOTAL_ITEMS,
  ITEMS_PER_TYPE,
  ICAR_TYPES,
} from "./config";

describe("config", () => {
  it("sets a 12-minute test duration", () => {
    expect(TEST_DURATION_MS).toBe(720_000);
  });

  it("serves 12 items as 4 of each of the three ICAR types", () => {
    expect(ICAR_TYPES).toEqual(["matrix", "rotation", "series"]);
    expect(ITEMS_PER_TYPE).toBe(4);
    expect(TOTAL_ITEMS).toBe(12);
  });
});
