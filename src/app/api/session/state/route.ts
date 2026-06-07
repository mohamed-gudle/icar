import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { getSessionState } from "@/lib/session";
import { CANDIDATE_COOKIE, verifySession } from "@/lib/candidate-session";

export const runtime = "nodejs";

/** Resume/poll the current state of the candidate's in-test session. */
export async function GET(req: NextRequest) {
  const sessionId = verifySession(req.cookies.get(CANDIDATE_COOKIE)?.value);
  if (!sessionId) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  const db = await getDb();
  const state = await getSessionState(db, sessionId);
  if (!state) return NextResponse.json({ error: "no_session" }, { status: 404 });
  return NextResponse.json({ state });
}
