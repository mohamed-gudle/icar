import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { accessTokens } from "@/db/schema";
import { createToken, buildInviteUrl } from "@/lib/tokens";
import { DEFAULT_INVITE_EXPIRY_DAYS } from "@/lib/config";

export const runtime = "nodejs";

const CreateBody = z.object({
  candidateName: z.string().trim().min(1).max(200),
  candidateEmail: z.string().trim().email().max(320),
  expiryDays: z.number().int().positive().max(90).optional(),
});

function requestOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}

/** GET: list issued tokens (admin). */
export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }
  const db = await getDb();
  const rows = await db
    .select({
      id: accessTokens.id,
      candidateName: accessTokens.candidateName,
      candidateEmail: accessTokens.candidateEmail,
      status: accessTokens.status,
      expiresAt: accessTokens.expiresAt,
      consumedAt: accessTokens.consumedAt,
      createdAt: accessTokens.createdAt,
    })
    .from(accessTokens)
    .orderBy(desc(accessTokens.createdAt))
    .limit(500);
  return NextResponse.json({ tokens: rows });
}

/** POST: generate a single-use, expiring invite token (admin). */
export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { candidateName, candidateEmail, expiryDays } = parsed.data;

  const days = expiryDays ?? DEFAULT_INVITE_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const db = await getDb();
  const { id, raw } = await createToken(db, {
    candidateName,
    candidateEmail,
    expiresAt,
    createdBy: admin.email ?? admin.uid,
  });

  // The raw token is returned exactly once, here, so the admin can copy the link.
  return NextResponse.json({
    id,
    inviteUrl: buildInviteUrl(requestOrigin(req), raw),
    expiresAt,
  });
}
