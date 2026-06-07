/**
 * Pure authorization helpers — no Next.js / Firebase imports, so they are
 * safe to unit test and import from anywhere.
 */

/**
 * Firebase Hosting / App Hosting only forward a cookie named `__session`
 * through the CDN, so the admin session cookie must use this exact name.
 */
export const SESSION_COOKIE = "__session";

/** Does this decoded token carry the admin custom claim? */
export function hasAdminClaim(
  claims: Record<string, unknown> | null | undefined,
): boolean {
  return claims?.admin === true;
}

export function sessionCookieMaxAgeMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const days = Number(env.ADMIN_SESSION_DAYS ?? "5");
  const safe = Number.isFinite(days) && days > 0 ? days : 5;
  return safe * 24 * 60 * 60 * 1000;
}
