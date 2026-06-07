import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, closeDb } from "@/db/client";
import { accessTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createToken, consumeToken, generateToken } from "./tokens";

/**
 * Integration coverage for the single-use token guarantee.
 * Requires a migrated Postgres reachable via LOCAL_DATABASE_URL.
 * Skipped automatically when no DB is configured.
 */
const hasDb = Boolean(process.env.LOCAL_DATABASE_URL);

describe.skipIf(!hasDb)("token consume (integration)", () => {
  beforeAll(async () => {
    await getDb();
  });
  afterAll(async () => {
    await closeDb();
  });

  it("consumes a valid unused token exactly once", async () => {
    const db = await getDb();
    const { raw } = await createToken(db, {
      candidateName: "A",
      candidateEmail: "a@x.com",
      expiresAt: new Date(Date.now() + 60_000),
      createdBy: "test",
    });

    const first = await consumeToken(db, raw);
    expect(first).not.toBeNull();

    const second = await consumeToken(db, raw);
    expect(second).toBeNull();
  });

  it("lets exactly one of two concurrent consumes win the race", async () => {
    const db = await getDb();
    const { raw } = await createToken(db, {
      candidateName: "B",
      candidateEmail: "b@x.com",
      expiresAt: new Date(Date.now() + 60_000),
      createdBy: "test",
    });

    const [r1, r2] = await Promise.all([
      consumeToken(db, raw),
      consumeToken(db, raw),
    ]);
    const winners = [r1, r2].filter(Boolean);
    expect(winners).toHaveLength(1);
  });

  it("rejects an expired token even if unused", async () => {
    const db = await getDb();
    const { raw, hash } = generateToken();
    await db.insert(accessTokens).values({
      tokenHash: hash,
      candidateName: "C",
      candidateEmail: "c@x.com",
      expiresAt: new Date(Date.now() - 1000), // already expired
      createdBy: "test",
    });
    const result = await consumeToken(db, raw);
    expect(result).toBeNull();
    // and the row remains unused (not flipped to consumed)
    const [row] = await db
      .select()
      .from(accessTokens)
      .where(eq(accessTokens.tokenHash, hash));
    expect(row.status).toBe("unused");
  });

  it("returns null for an unknown token", async () => {
    const db = await getDb();
    expect(await consumeToken(db, "does-not-exist")).toBeNull();
  });
});
