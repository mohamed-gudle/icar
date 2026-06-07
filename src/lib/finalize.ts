import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { questions, sessionAnswers, testSessions } from "@/db/schema";
import type * as schema from "@/db/schema";
import { scoreAnswers } from "./scoring";
import { computeElapsedMs, isOverTime } from "./timer";
import { TEST_DURATION_MS, SUBMIT_GRACE_MS } from "./config";

type Db = NodePgDatabase<typeof schema>;

export type FinalizeResult = {
  status: "submitted" | "expired";
  rawScore: number;
  total: number;
  totalTimeMs: number;
  overTime: boolean;
};

async function correctKeysFor(
  db: Db,
  questionIds: string[],
): Promise<Map<string, string>> {
  if (questionIds.length === 0) return new Map();
  const rows = await db
    .select({ id: questions.id, key: questions.correctOptionKey })
    .from(questions)
    .where(inArray(questions.id, questionIds));
  return new Map(rows.map((r) => [r.id, r.key]));
}

async function scoreSession(
  db: Db,
  sessionId: string,
  questionOrder: string[],
): Promise<number> {
  const answers = await db
    .select({
      questionId: sessionAnswers.questionId,
      selectedOptionKey: sessionAnswers.selectedOptionKey,
    })
    .from(sessionAnswers)
    .where(eq(sessionAnswers.sessionId, sessionId));
  const keys = await correctKeysFor(db, questionOrder);
  return scoreAnswers(answers, keys);
}

/**
 * Finalize on candidate submit. Idempotent: a second submit returns the
 * already-finalized result and does NOT rescore. Overruns are accepted but
 * flagged (over_time), never silently rejected.
 */
export async function finalizeSubmit(
  db: Db,
  sessionId: string,
  now: Date = new Date(),
): Promise<FinalizeResult | null> {
  const [session] = await db
    .select()
    .from(testSessions)
    .where(eq(testSessions.id, sessionId));
  if (!session) return null;

  if (session.status !== "in_progress") {
    return {
      status: session.status,
      rawScore: session.rawScore ?? 0,
      total: session.questionOrder.length,
      totalTimeMs: session.totalTimeMs ?? 0,
      overTime: session.overTime,
    };
  }

  const raw = await scoreSession(db, sessionId, session.questionOrder);
  const elapsed = computeElapsedMs(session.startedAt, now);
  const overTime = isOverTime(elapsed, TEST_DURATION_MS, SUBMIT_GRACE_MS);

  await db
    .update(testSessions)
    .set({
      status: "submitted",
      rawScore: raw,
      totalTimeMs: elapsed,
      overTime,
      submittedAt: now,
    })
    // Guard keeps the update idempotent under a concurrent double-submit:
    // only the row still in_progress is written.
    .where(
      and(
        eq(testSessions.id, sessionId),
        eq(testSessions.status, "in_progress"),
      ),
    );

  return {
    status: "submitted",
    rawScore: raw,
    total: session.questionOrder.length,
    totalTimeMs: elapsed,
    overTime,
  };
}

/**
 * Finalize abandoned sessions whose window (limit + grace) has elapsed without
 * a submit. Scores whatever was persisted and marks them expired.
 * Returns the number finalized.
 */
export async function sweepExpired(
  db: Db,
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - (TEST_DURATION_MS + SUBMIT_GRACE_MS));
  const stale = await db
    .select()
    .from(testSessions)
    .where(
      and(
        eq(testSessions.status, "in_progress"),
        isNotNull(testSessions.startedAt),
        lt(testSessions.startedAt, cutoff),
      ),
    );

  let count = 0;
  for (const session of stale) {
    const raw = await scoreSession(db, session.id, session.questionOrder);
    const deadline = session.startedAt
      ? new Date(session.startedAt.getTime() + TEST_DURATION_MS)
      : now;
    const res = await db
      .update(testSessions)
      .set({
        status: "expired",
        rawScore: raw,
        totalTimeMs: TEST_DURATION_MS, // used the full window
        submittedAt: deadline,
      })
      .where(
        and(
          eq(testSessions.id, session.id),
          eq(testSessions.status, "in_progress"),
        ),
      )
      .returning({ id: testSessions.id });
    if (res.length) count++;
  }
  return count;
}
