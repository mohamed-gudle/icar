import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db/client";
import { sweepExpired } from "@/lib/finalize";

export const runtime = "nodejs";

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(req: NextRequest): boolean {
  const provided =
    req.headers.get("x-sweep-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  // SWEEP_SECRET for manual/Cloud Scheduler calls; CRON_SECRET is the value
  // Vercel Cron puts in the Authorization: Bearer header automatically.
  return (
    matches(provided, process.env.SWEEP_SECRET) ||
    matches(provided, process.env.CRON_SECRET)
  );
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const finalized = await sweepExpired(db);
  return NextResponse.json({ finalized });
}

/** Vercel Cron invokes the path with GET. */
export async function GET(req: NextRequest) {
  return handle(req);
}

/** Cloud Scheduler / manual invocation use POST. */
export async function POST(req: NextRequest) {
  return handle(req);
}
