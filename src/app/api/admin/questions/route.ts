import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { questions } from "@/db/schema";
import { validateQuestionInput } from "@/lib/question-validate";

export const runtime = "nodejs";

const OptionSchema = z.object({
  key: z.string().min(1).max(4),
  text: z.string().max(200).optional(),
  imagePath: z.string().max(500).optional(),
});

const CreateSchema = z.object({
  type: z.enum(["matrix", "rotation", "series"]),
  stemText: z.string().max(500).nullish(),
  stemImagePath: z.string().max(500).nullish(),
  options: z.array(OptionSchema).min(4).max(6),
  correctOptionKey: z.string().min(1).max(4),
  numOptions: z.number().int().min(4).max(6),
  difficulty: z.number().min(0).max(1).nullish(),
});

/** GET: list all questions (admin). */
export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }
  const db = await getDb();
  const rows = await db
    .select()
    .from(questions)
    .orderBy(desc(questions.createdAt))
    .limit(1000);
  return NextResponse.json({ questions: rows });
}

/** POST: create a question (admin). */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const valid = validateQuestionInput(parsed.data);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const db = await getDb();
  const [row] = await db
    .insert(questions)
    .values({
      type: parsed.data.type,
      stemText: parsed.data.stemText ?? null,
      stemImagePath: parsed.data.stemImagePath ?? null,
      options: parsed.data.options,
      correctOptionKey: parsed.data.correctOptionKey,
      numOptions: parsed.data.numOptions,
      difficulty: parsed.data.difficulty ?? null,
    })
    .returning({ id: questions.id });
  return NextResponse.json({ id: row.id });
}
