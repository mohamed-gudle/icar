/**
 * Pure timing logic. Both endpoints (`started_at` and the comparison `now`)
 * are server-generated, so the candidate's device clock never enters any
 * calculation — client clock skew is irrelevant by construction.
 */

export function computeElapsedMs(startedAt: Date | null, now: Date): number {
  if (!startedAt) return 0;
  return Math.max(0, now.getTime() - startedAt.getTime());
}

export function remainingMs(elapsedMs: number, durationMs: number): number {
  return Math.max(0, durationMs - elapsedMs);
}

/** True when elapsed exceeds the hard limit plus the latency grace window. */
export function isOverTime(
  elapsedMs: number,
  durationMs: number,
  graceMs: number,
): boolean {
  return elapsedMs > durationMs + graceMs;
}

/** Has the session blown past limit+grace such that a sweep should finalize it? */
export function isExpired(
  startedAt: Date | null,
  now: Date,
  durationMs: number,
  graceMs: number,
): boolean {
  if (!startedAt) return false;
  return isOverTime(computeElapsedMs(startedAt, now), durationMs, graceMs);
}
