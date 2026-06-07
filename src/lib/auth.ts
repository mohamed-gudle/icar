import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase-admin";
import { SESSION_COOKIE, hasAdminClaim } from "./auth-claims";

export { SESSION_COOKIE, hasAdminClaim, sessionCookieMaxAgeMs } from "./auth-claims";

/**
 * Verifies the admin session cookie and the admin claim.
 * Returns the decoded token if the caller is an admin, else null.
 * `checkRevoked: true` rejects revoked/disabled/deleted accounts.
 */
export async function getAdmin(): Promise<DecodedIdToken | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return hasAdminClaim(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

/** Throws a 401/403 Response for route handlers when the caller is not an admin. */
export async function requireAdmin(): Promise<DecodedIdToken> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) {
    throw new Response("Unauthorized", { status: 401 });
  }
  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (!hasAdminClaim(decoded)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return decoded;
}
