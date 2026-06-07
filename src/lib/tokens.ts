import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { accessTokens } from "@/db/schema";
import type { Db, DbExecutor } from "@/db/client";

/** 32 bytes = 256 bits of CSPRNG entropy, url-safe encoded. */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

/** Deterministic SHA-256 hash. The token's own entropy makes a slow hash unnecessary. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Build the candidate invite URL for a raw token. */
export function buildInviteUrl(origin: string, raw: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/test?token=${encodeURIComponent(raw)}`;
}

export type CreateTokenInput = {
  candidateName: string;
  candidateEmail: string;
  expiresAt: Date;
  createdBy: string;
};

/** Insert a new invite token. Returns the row id and the raw token (shown once). */
export async function createToken(
  db: Db,
  input: CreateTokenInput,
): Promise<{ id: string; raw: string; expiresAt: Date }> {
  const { raw, hash } = generateToken();
  const [row] = await db
    .insert(accessTokens)
    .values({
      tokenHash: hash,
      candidateName: input.candidateName,
      candidateEmail: input.candidateEmail,
      expiresAt: input.expiresAt,
      createdBy: input.createdBy,
    })
    .returning({ id: accessTokens.id, expiresAt: accessTokens.expiresAt });
  return { id: row.id, raw, expiresAt: row.expiresAt };
}

export type ConsumedToken = {
  id: string;
  candidateName: string;
  candidateEmail: string;
};

/**
 * Atomically consume a token. The single conditional UPDATE wins the race
 * against concurrent tabs: only the request that flips `unused -> consumed`
 * gets a row back. Expired or already-consumed tokens return null.
 *
 * Pass a transaction handle so the caller can create the session in the same
 * transaction; the flip itself is atomic regardless.
 */
export async function consumeToken(
  db: DbExecutor,
  rawToken: string,
): Promise<ConsumedToken | null> {
  const hash = hashToken(rawToken);
  const rows = await db
    .update(accessTokens)
    .set({ status: "consumed", consumedAt: sql`now()` })
    .where(
      and(
        eq(accessTokens.tokenHash, hash),
        eq(accessTokens.status, "unused"),
        gt(accessTokens.expiresAt, sql`now()`),
      ),
    )
    .returning({
      id: accessTokens.id,
      candidateName: accessTokens.candidateName,
      candidateEmail: accessTokens.candidateEmail,
    });
  return rows[0] ?? null;
}
