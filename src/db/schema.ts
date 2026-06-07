import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/** ICAR item type. Verbal is intentionally excluded from this screen. */
export const icarType = pgEnum("icar_type", ["matrix", "rotation", "series"]);

export const tokenStatus = pgEnum("token_status", [
  "unused",
  "consumed",
  "expired",
]);

export const sessionStatus = pgEnum("session_status", [
  "in_progress",
  "submitted",
  "expired",
]);

export const proctoringEventType = pgEnum("proctoring_event_type", [
  "blur",
  "visibility_hidden",
  "visibility_visible",
]);

/** One selectable option. Either `text` (series) or `imagePath` (visual). */
export type QuestionOption = {
  key: string; // "A".."F"
  text?: string;
  imagePath?: string; // Firebase Storage object path
};

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: icarType("type").notNull(),
  /** Stem for series items (e.g. "A, C, E, G, __"). */
  stemText: text("stem_text"),
  /** Stem image for matrix / rotation items (Storage object path). */
  stemImagePath: text("stem_image_path"),
  options: jsonb("options").$type<QuestionOption[]>().notNull(),
  /** Server-only. Never serialized to the candidate client. */
  correctOptionKey: text("correct_option_key").notNull(),
  numOptions: integer("num_options").notNull(),
  difficulty: real("difficulty"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accessTokens = pgTable(
  "access_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** sha256(rawToken) — the raw token is never stored. */
    tokenHash: text("token_hash").notNull(),
    candidateName: text("candidate_name").notNull(),
    candidateEmail: text("candidate_email").notNull(),
    status: tokenStatus("status").notNull().default("unused"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    /** Set when consumed. No hard FK (avoids a cycle with test_sessions). */
    testSessionId: uuid("test_session_id"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("access_tokens_token_hash_idx").on(t.tokenHash),
  }),
);

export const testSessions = pgTable("test_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenId: uuid("token_id")
    .notNull()
    .references(() => accessTokens.id),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email").notNull(),
  /** One-shot server timestamp set on init; never reset on reload. */
  startedAt: timestamp("started_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  status: sessionStatus("status").notNull().default("in_progress"),
  /** Frozen ordered list of the 12 selected question ids. */
  questionOrder: jsonb("question_order").$type<string[]>().notNull(),
  rawScore: integer("raw_score"),
  totalTimeMs: integer("total_time_ms"),
  overTime: boolean("over_time").notNull().default(false),
  flaggedForReview: boolean("flagged_for_review").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessionAnswers = pgTable(
  "session_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testSessions.id),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    selectedOptionKey: text("selected_option_key").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    position: integer("position").notNull(),
  },
  (t) => ({
    // Enforces first-write-wins / no-back-navigation at the DB level: a second
    // answer to the same question in the same session is rejected.
    sessionQuestionIdx: uniqueIndex("session_answers_session_question_idx").on(
      t.sessionId,
      t.questionId,
    ),
  }),
);

export const proctoringEvents = pgTable(
  "proctoring_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testSessions.id),
    type: proctoringEventType("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    durationMs: integer("duration_ms"),
    questionIndex: integer("question_index"),
  },
  (t) => ({
    sessionIdx: index("proctoring_events_session_idx").on(t.sessionId),
  }),
);

export type Question = typeof questions.$inferSelect;
export type AccessToken = typeof accessTokens.$inferSelect;
export type TestSession = typeof testSessions.$inferSelect;
export type SessionAnswer = typeof sessionAnswers.$inferSelect;
export type ProctoringEvent = typeof proctoringEvents.$inferSelect;
