import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Candidate in-test session cookie: binds the browser to one test_session
 * without a login. Format `${sessionId}.${hmac}`, HMAC-signed so the id cannot
 * be forged. All authority still lives server-side (answers lock, timer is
 * server-validated); the signature just prevents tampering with the binding.
 */
export const CANDIDATE_COOKIE = "test_session";

function secret(env: Record<string, string | undefined> = process.env): string {
  // Dedicated secret — deliberately NOT shared with SWEEP_SECRET. Sharing would
  // let disclosure of the cron secret forge candidate cookies for any session,
  // and would couple their rotation.
  const s = env.CANDIDATE_COOKIE_SECRET;
  if (!s) throw new Error("CANDIDATE_COOKIE_SECRET must be set");
  return s;
}

export function signSession(
  sessionId: string,
  env?: Record<string, string | undefined>,
): string {
  const mac = createHmac("sha256", secret(env)).update(sessionId).digest("hex");
  return `${sessionId}.${mac}`;
}

/** Returns the sessionId if the signature is valid, else null. */
export function verifySession(
  value: string | undefined | null,
  env?: Record<string, string | undefined>,
): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const sessionId = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = createHmac("sha256", secret(env))
    .update(sessionId)
    .digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? sessionId : null;
}
