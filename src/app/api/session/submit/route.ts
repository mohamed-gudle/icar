import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { finalizeSubmit } from "@/lib/finalize";
import { CANDIDATE_COOKIE, verifySession } from "@/lib/candidate-session";

export const runtime = "nodejs";

/**
 * Finalize the candidate's test. Triggered by the candidate (explicit submit,
 * auto-submit at zero, or the blur handler). Idempotent and server-scored.
 * The candidate is told only that the test is complete — never the score.
 */
export async function POST(req: NextRequest) {
  const sessionId = verifySession(req.cookies.get(CANDIDATE_COOKIE)?.value);
  if (!sessionId) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const db = await getDb();
  const result = await finalizeSubmit(db, sessionId);
  if (!result) {
    return NextResponse.json({ error: "no_session" }, { status: 404 });
  }

  // Deliberately omit score/time from the candidate-facing response.
  return NextResponse.json({ done: true, status: result.status });
}
