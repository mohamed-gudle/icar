import { ICAR_TYPES, ITEMS_PER_TYPE, type IcarType } from "./config";

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
    public readonly type: IcarType,
    public readonly available: number,
    public readonly required: number,
  ) {
    super(
      `Not enough active "${type}" questions: have ${available}, need ${required}.`,
    );
    this.name = "InsufficientPoolError";
  }
}

/**
 * Select the frozen question order for a session: ITEMS_PER_TYPE of each ICAR
 * type, drawn randomly from the active pool, then the combined set shuffled so
 * types are interleaved. Throws InsufficientPoolError if any type is short.
 */
export function selectQuestionOrder(
  pool: readonly PoolItem[],
  rng: () => number = Math.random,
): string[] {
  const chosen: string[] = [];
  for (const type of ICAR_TYPES) {
    const ofType = pool.filter((p) => p.type === type);
    if (ofType.length < ITEMS_PER_TYPE) {
      throw new InsufficientPoolError(type, ofType.length, ITEMS_PER_TYPE);
    }
    const picked = shuffle(ofType, rng).slice(0, ITEMS_PER_TYPE);
    chosen.push(...picked.map((p) => p.id));
  }
  return shuffle(chosen, rng);
}
