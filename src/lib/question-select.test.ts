import { describe, it, expect } from "vitest";
import {
  selectQuestionOrder,
  shuffle,
  InsufficientPoolError,
  type PoolItem,
} from "./question-select";
import { ITEMS_PER_TYPE, ICAR_TYPES, TOTAL_ITEMS } from "./config";

/** Deterministic seeded RNG for reproducible tests. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pool(perType: number): PoolItem[] {
  const items: PoolItem[] = [];
  for (const type of ICAR_TYPES) {
    for (let i = 0; i < perType; i++) items.push({ id: `${type}-${i}`, type });
  }
  return items;
}

describe("shuffle", () => {
  it("preserves all elements (no loss/duplication)", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, mulberry32(1));
    expect(out.slice().sort()).toEqual(input);
    expect(out).toHaveLength(input.length);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    shuffle(input, mulberry32(2));
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("selectQuestionOrder", () => {
  it("selects exactly ITEMS_PER_TYPE of each type, TOTAL_ITEMS total", () => {
    const order = selectQuestionOrder(pool(10), mulberry32(42));
    expect(order).toHaveLength(TOTAL_ITEMS);
    for (const type of ICAR_TYPES) {
      const count = order.filter((id) => id.startsWith(type)).length;
      expect(count).toBe(ITEMS_PER_TYPE);
    }
  });

  it("returns unique ids", () => {
    const order = selectQuestionOrder(pool(10), mulberry32(7));
    expect(new Set(order).size).toBe(order.length);
  });

  it("works at the exact minimum pool size", () => {
    const order = selectQuestionOrder(pool(ITEMS_PER_TYPE), mulberry32(3));
    expect(order).toHaveLength(TOTAL_ITEMS);
  });

  it("throws InsufficientPoolError when a type is short", () => {
    const short = pool(ITEMS_PER_TYPE).filter(
      (p) => !(p.type === "rotation" && p.id.endsWith("-0")),
    );
    expect(() => selectQuestionOrder(short, mulberry32(1))).toThrow(
      InsufficientPoolError,
    );
  });
});
