import { desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { testSessions } from "@/db/schema";
import type * as schema from "@/db/schema";

type Db = NodePgDatabase<typeof schema>;

/** Format a duration in ms as "Mm SSs" (e.g. 723000 -> "12m 03s"). */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export type ResultRow = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: "in_progress" | "submitted" | "expired";
  startedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  rawScore: number | null;
  total: number;
  totalTimeMs: number | null;
  overTime: boolean;
  flaggedForReview: boolean;
};

export async function listResults(db: Db, limit = 1000): Promise<ResultRow[]> {
  const rows = await db
    .select()
    .from(testSessions)
    .orderBy(desc(testSessions.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    candidateName: r.candidateName,
    candidateEmail: r.candidateEmail,
    status: r.status,
    startedAt: r.startedAt,
    submittedAt: r.submittedAt,
    createdAt: r.createdAt,
    rawScore: r.rawScore,
    total: r.questionOrder.length,
    totalTimeMs: r.totalTimeMs,
    overTime: r.overTime,
    flaggedForReview: r.flaggedForReview,
  }));
}
