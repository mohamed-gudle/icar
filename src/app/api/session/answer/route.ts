import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { recordAnswer } from "@/lib/session";
import { CANDIDATE_COOKIE, verifySession } from "@/lib/candidate-session";

export const runtime = "nodejs";

const Body = z.object({
  questionId: z.string().uuid(),
  optionKey: z.string().min(1).max(4),
});

const STATUS: Record<string, number> = {
  not_found: 404,
  not_in_progress: 409,
  time_expired: 410,
  out_of_order: 409,
  invalid_option: 400,
  already_answered: 409,
};

/** Record one answer for the candidate's current question. */
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
  const result = await recordAnswer(
    db,
    sessionId,
    parsed.data.questionId,
    parsed.data.optionKey,
  );

  if (result.kind === "ok") {
    return NextResponse.json({
      index: result.index,
      total: result.total,
      done: result.done,
    });
  }
  return NextResponse.json(
    { error: result.kind },
    { status: STATUS[result.kind] ?? 400 },
  );
}
