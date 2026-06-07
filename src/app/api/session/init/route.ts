import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { initSession } from "@/lib/session";
import { CANDIDATE_COOKIE, signSession } from "@/lib/candidate-session";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(1) });

/** Start (or resume) a candidate test session from an invite token. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  const db = await getDb();
  const result = await initSession(db, parsed.data.token);

  switch (result.kind) {
    case "invalid":
      return NextResponse.json({ error: "invalid_token" }, { status: 404 });
    case "expired":
      return NextResponse.json({ error: "expired_token" }, { status: 410 });
    case "completed":
      return NextResponse.json({ error: "already_completed" }, { status: 409 });
    case "unavailable":
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    case "ok": {
      const res = NextResponse.json({ state: result.state });
      res.cookies.set(CANDIDATE_COOKIE, signSession(result.sessionId), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      return res;
    }
  }
}
