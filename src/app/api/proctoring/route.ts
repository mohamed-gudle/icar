import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { recordProctoringEvent } from "@/lib/proctoring";
import { CANDIDATE_COOKIE, verifySession } from "@/lib/candidate-session";

export const runtime = "nodejs";

const Body = z.object({
  type: z.enum(["blur", "visibility_hidden", "visibility_visible"]),
  durationMs: z.number().int().nonnegative().max(86_400_000).optional(),
  questionIndex: z.number().int().nonnegative().max(100).optional(),
});

/** Record a candidate proctoring event (tab-away / blur). Advisory, server-aggregated. */
export async function POST(req: NextRequest) {
  const sessionId = verifySession(req.cookies.get(CANDIDATE_COOKIE)?.value);
  if (!sessionId) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const db = await getDb();
  const ok = await recordProctoringEvent(db, sessionId, parsed.data);
  if (!ok) return NextResponse.json({ error: "no_session" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
