import { eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  accessTokens,
  questions,
  sessionAnswers,
  testSessions,
  type Question,
  type QuestionOption,
} from "@/db/schema";
import type * as schema from "@/db/schema";
import { consumeToken, hashToken } from "./tokens";
import { selectQuestionOrder, type PoolItem } from "./question-select";
import { TEST_DURATION_MS, SUBMIT_GRACE_MS, type IcarType } from "./config";

type Db = NodePgDatabase<typeof schema>;

/** Candidate-safe question shape — the correct answer key is never included. */
export type ClientQuestion = {
  id: string;
  type: IcarType;
  stemText: string | null;
  stemImagePath: string | null;
  options: QuestionOption[];
  numOptions: number;
};

export function toClientQuestion(q: Question): ClientQuestion {
  return {
    id: q.id,
    type: q.type,
    stemText: q.stemText,
    stemImagePath: q.stemImagePath,
    // Strip any correctness hints; options carry only key + presentation.
    options: q.options.map((o) => ({
      key: o.key,
      text: o.text,
      imagePath: o.imagePath,
    })),
    numOptions: q.numOptions,
  };
}

export type SessionState = {
  sessionId: string;
  status: "in_progress" | "submitted" | "expired";
  index: number; // number of answers recorded so far
  total: number;
  remainingMs: number;
  question: ClientQuestion | null; // null when finished
};

export type InitResult =
  | { kind: "ok"; sessionId: string; state: SessionState }
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "completed" };

async function loadQuestionsInOrder(
  db: Db,
  ids: string[],
): Promise<Question[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
}

async function buildState(
  db: Db,
  session: typeof testSessions.$inferSelect,
): Promise<SessionState> {
  const order = session.questionOrder;
  const answered = await db
    .select({ id: sessionAnswers.id })
    .from(sessionAnswers)
    .where(eq(sessionAnswers.sessionId, session.id));
  const index = answered.length;

  const remainingMs = session.startedAt
    ? Math.max(0, TEST_DURATION_MS - (Date.now() - session.startedAt.getTime()))
    : TEST_DURATION_MS;

  let question: ClientQuestion | null = null;
  if (session.status === "in_progress" && index < order.length) {
    const loaded = await loadQuestionsInOrder(db, [order[index]]);
    question = loaded[0] ? toClientQuestion(loaded[0]) : null;
  }

  return {
    sessionId: session.id,
    status: session.status,
    index,
    total: order.length,
    remainingMs,
    question,
  };
}

/**
 * Initialize (or resume) a session from a raw invite token.
 * - unused + valid  -> consume atomically, create session, one-shot started_at
 * - already consumed -> resume the bound in-progress session (reload-safe)
 * - expired/invalid/finished -> typed result
 */
export async function initSession(db: Db, rawToken: string): Promise<InitResult> {
  const hash = hashToken(rawToken);
  const [tok] = await db
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.tokenHash, hash));
  if (!tok) return { kind: "invalid" };

  if (tok.status === "unused") {
    if (tok.expiresAt.getTime() <= Date.now()) return { kind: "expired" };

    // Atomic consume; only the winning request creates the session.
    const consumed = await consumeToken(db, rawToken);
    if (consumed) {
      const pool = await db
        .select({ id: questions.id, type: questions.type })
        .from(questions)
        .where(eq(questions.active, true));
      const order = selectQuestionOrder(pool as PoolItem[]);

      const [session] = await db
        .insert(testSessions)
        .values({
          tokenId: tok.id,
          candidateName: tok.candidateName,
          candidateEmail: tok.candidateEmail,
          startedAt: new Date(),
          questionOrder: order,
        })
        .returning();
      await db
        .update(accessTokens)
        .set({ testSessionId: session.id })
        .where(eq(accessTokens.id, tok.id));

      return { kind: "ok", sessionId: session.id, state: await buildState(db, session) };
    }
    // Lost the race; fall through to resume the now-consumed token.
  }

  // Consumed token: resume its bound session if still in progress.
  const [refreshed] = await db
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.id, tok.id));
  if (refreshed?.status === "consumed" && refreshed.testSessionId) {
    const [session] = await db
      .select()
      .from(testSessions)
      .where(eq(testSessions.id, refreshed.testSessionId));
    if (session) {
      if (session.status === "in_progress") {
        return {
          kind: "ok",
          sessionId: session.id,
          state: await buildState(db, session),
        };
      }
      return { kind: "completed" };
    }
  }
  return { kind: "expired" };
}

export async function getSessionState(
  db: Db,
  sessionId: string,
): Promise<SessionState | null> {
  const [session] = await db
    .select()
    .from(testSessions)
    .where(eq(testSessions.id, sessionId));
  if (!session) return null;
  return buildState(db, session);
}

export type AnswerResult =
  | { kind: "ok"; index: number; total: number; done: boolean }
  | { kind: "not_found" }
  | { kind: "not_in_progress" }
  | { kind: "time_expired" }
  | { kind: "out_of_order" }
  | { kind: "invalid_option" }
  | { kind: "already_answered" };

/**
 * Record one answer, enforcing sequential order and first-write-wins.
 * The DB unique(session, question) index is the ultimate lock.
 */
export async function recordAnswer(
  db: Db,
  sessionId: string,
  questionId: string,
  optionKey: string,
): Promise<AnswerResult> {
  const [session] = await db
    .select()
    .from(testSessions)
    .where(eq(testSessions.id, sessionId));
  if (!session) return { kind: "not_found" };
  if (session.status !== "in_progress") return { kind: "not_in_progress" };

  if (
    session.startedAt &&
    Date.now() > session.startedAt.getTime() + TEST_DURATION_MS + SUBMIT_GRACE_MS
  ) {
    return { kind: "time_expired" };
  }

  const order = session.questionOrder;
  const answered = await db
    .select({ questionId: sessionAnswers.questionId })
    .from(sessionAnswers)
    .where(eq(sessionAnswers.sessionId, sessionId));
  const index = answered.length;

  // Must answer the current question in sequence (blocks skipping & going back).
  if (order[index] !== questionId) return { kind: "out_of_order" };

  // Validate the option belongs to the question.
  const [q] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId));
  if (!q) return { kind: "out_of_order" };
  if (!q.options.some((o) => o.key === optionKey)) {
    return { kind: "invalid_option" };
  }

  try {
    await db.insert(sessionAnswers).values({
      sessionId,
      questionId,
      selectedOptionKey: optionKey,
      position: index,
    });
  } catch (err) {
    // Unique(session, question) violation -> already answered (lock held).
    if (isUniqueViolation(err)) return { kind: "already_answered" };
    throw err;
  }

  const newIndex = index + 1;
  return {
    kind: "ok",
    index: newIndex,
    total: order.length,
    done: newIndex >= order.length,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

/** Convenience for callers that hold an answer count and need the current qid. */
export function currentQuestionId(
  order: string[],
  answeredCount: number,
): string | null {
  return answeredCount < order.length ? order[answeredCount] : null;
}
