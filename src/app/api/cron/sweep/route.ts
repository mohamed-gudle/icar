import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db/client";
import { sweepExpired } from "@/lib/finalize";

export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  const expected = process.env.SWEEP_SECRET;
  if (!expected) return false;
  const provided =
    req.headers.get("x-sweep-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Finalizes abandoned/expired sessions. Invoked by Cloud Scheduler with the
 * shared secret. Rejects unauthenticated callers.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const finalized = await sweepExpired(db);
  return NextResponse.json({ finalized });
}
