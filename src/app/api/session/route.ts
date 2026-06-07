import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import {
  SESSION_COOKIE,
  hasAdminClaim,
  sessionCookieMaxAgeMs,
} from "@/lib/auth-claims";

export const runtime = "nodejs";

/**
 * Exchanges a freshly-obtained Firebase ID token for an httpOnly session
 * cookie. Only mints the cookie if the user actually holds the admin claim,
 * so non-admins can never obtain an admin session even with a valid login.
 */
export async function POST(req: Request) {
  let idToken: string | undefined;
  try {
    ({ idToken } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "missing idToken" }, { status: 400 });
  }

  const auth = adminAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  if (!hasAdminClaim(decoded)) {
    return NextResponse.json({ error: "not an admin" }, { status: 403 });
  }

  const maxAgeMs = sessionCookieMaxAgeMs();
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: maxAgeMs,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  });
  return res;
}

/** Sign out: clear the session cookie. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
