import { type NextRequest, NextResponse } from "next/server";
import { inArray, eq } from "drizzle-orm";
import { downloadAsset } from "@/lib/storage";
import { getAdmin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { questions, testSessions } from "@/db/schema";
import { CANDIDATE_COOKIE, verifySession } from "@/lib/candidate-session";

export const runtime = "nodejs";

/** Image paths a candidate's own session is allowed to load. */
async function candidateAllowedPaths(sessionId: string): Promise<Set<string>> {
  const db = await getDb();
  const [session] = await db
    .select({ questionOrder: testSessions.questionOrder })
    .from(testSessions)
    .where(eq(testSessions.id, sessionId));
  if (!session) return new Set();

  const rows = await db
    .select({ stem: questions.stemImagePath, options: questions.options })
    .from(questions)
    .where(inArray(questions.id, session.questionOrder));

  const allowed = new Set<string>();
  for (const r of rows) {
    if (r.stem) allowed.add(r.stem);
    for (const o of r.options) if (o.imagePath) allowed.add(o.imagePath);
  }
  return allowed;
}

/**
 * Server-mediated asset serving. The bucket is private (storage.rules denies
 * all client access); images flow only through here. A candidate may load only
 * images belonging to their own session's questions (prevents enumerating the
 * whole item bank); admins may load any questions/ asset.
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!path.startsWith("questions/") || path.includes("..")) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const candidate = verifySession(req.cookies.get(CANDIDATE_COOKIE)?.value);
  if (candidate) {
    const allowed = await candidateAllowedPaths(candidate);
    if (!allowed.has(path)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const asset = await downloadAsset(path);
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(asset.buffer), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
