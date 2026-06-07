import { ICAR_TYPES, ITEMS_PER_TYPE, TOTAL_ITEMS, type IcarType } from "./config";

export type PoolItem = { id: string; type: IcarType };

/**
 * Fisher-Yates shuffle using an injectable RNG (seedable in tests).
 * Returns a new array; does not mutate the input.
 */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class InsufficientPoolError extends Error {
  constructor(
    public readonly available: number,
    public readonly required: number,
  ) {
    super(
      `Not enough active questions: have ${available}, need ${required}.`,
    );
    this.name = "InsufficientPoolError";
  }
}

/**
 * Select the frozen question order for a session.
 *
 * Preference: a balanced ITEMS_PER_TYPE of each ICAR type. When a type is short
 * (e.g. an image-free, series-only pool), the remaining slots are topped up from
 * whatever active questions are available, up to TOTAL_ITEMS. Throws
 * InsufficientPoolError only when the pool has fewer than TOTAL_ITEMS in total.
 */
export function selectQuestionOrder(
  pool: readonly PoolItem[],
  rng: () => number = Math.random,
): string[] {
  const chosen: string[] = [];
  const taken = new Set<string>();

  // Balanced pass: up to ITEMS_PER_TYPE from each type.
  for (const type of ICAR_TYPES) {
    const ofType = pool.filter((p) => p.type === type);
    for (const p of shuffle(ofType, rng).slice(0, ITEMS_PER_TYPE)) {
      chosen.push(p.id);
      taken.add(p.id);
    }
  }

  // Top-up pass: fill any remaining slots from the rest of the pool.
  if (chosen.length < TOTAL_ITEMS) {
    const rest = pool.filter((p) => !taken.has(p.id));
    for (const p of shuffle(rest, rng)) {
      if (chosen.length >= TOTAL_ITEMS) break;
      chosen.push(p.id);
      taken.add(p.id);
    }
  }

  if (chosen.length < TOTAL_ITEMS) {
    throw new InsufficientPoolError(chosen.length, TOTAL_ITEMS);
  }
  return shuffle(chosen, rng);
}
