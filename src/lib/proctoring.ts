import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { proctoringEvents, testSessions } from "@/db/schema";
import type * as schema from "@/db/schema";

type Db = NodePgDatabase<typeof schema>;

export type ProctoringEventType = "blur" | "visibility_hidden" | "visibility_visible";

/** Event types that count as "left the test" and therefore flag for review. */
const AWAY_TYPES = new Set<ProctoringEventType>(["blur", "visibility_hidden"]);

export type ProctoringSummary = {
  awayEvents: number;
  totalAwayMs: number;
  longestAwayMs: number;
  flagged: boolean;
};

/**
 * Pure aggregation of raw proctoring events into a single reviewer-facing
 * summary. Client-reported counts are advisory; the server aggregates them.
 */
export function aggregateProctoring(
  events: readonly { type: string; durationMs?: number | null }[],
): ProctoringSummary {
  let awayEvents = 0;
  let totalAwayMs = 0;
  let longestAwayMs = 0;
  for (const e of events) {
    if (!AWAY_TYPES.has(e.type as ProctoringEventType)) continue;
    awayEvents++;
    const d = e.durationMs ?? 0;
    totalAwayMs += d;
    if (d > longestAwayMs) longestAwayMs = d;
  }
  return { awayEvents, totalAwayMs, longestAwayMs, flagged: awayEvents > 0 };
}

export type RecordEventInput = {
  type: ProctoringEventType;
  durationMs?: number;
  questionIndex?: number;
};

/**
 * Persist a proctoring event and, for away-type events, raise the session's
 * review flag. Returns false if the session does not exist. Recording an event
 * never touches the score.
 */
export async function recordProctoringEvent(
  db: Db,
  sessionId: string,
  input: RecordEventInput,
): Promise<boolean> {
  const [session] = await db
    .select({ id: testSessions.id })
    .from(testSessions)
    .where(eq(testSessions.id, sessionId));
  if (!session) return false;

  await db.insert(proctoringEvents).values({
    sessionId,
    type: input.type,
    durationMs: input.durationMs,
    questionIndex: input.questionIndex,
  });

  if (AWAY_TYPES.has(input.type)) {
    await db
      .update(testSessions)
      .set({ flaggedForReview: true })
      .where(eq(testSessions.id, sessionId));
  }
  return true;
}
