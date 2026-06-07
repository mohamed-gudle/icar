import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { listResults } from "@/lib/results";

export const runtime = "nodejs";

/** GET: candidate results for the analytics table (admin). */
export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }
  const db = await getDb();
  const results = await listResults(db);
  return NextResponse.json({ results });
}
