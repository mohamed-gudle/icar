import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { questions } from "@/db/schema";

export const runtime = "nodejs";

const PatchSchema = z.object({
  active: z.boolean(),
});

/**
 * PATCH: soft-activate/deactivate a question. Deactivation removes it from
 * candidate selection while preserving it for past sessions that reference it.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const db = await getDb();
  const updated = await db
    .update(questions)
    .set({ active: parsed.data.active, updatedAt: new Date() })
    .where(eq(questions.id, id))
    .returning({ id: questions.id, active: questions.active });
  if (!updated.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(updated[0]);
}
