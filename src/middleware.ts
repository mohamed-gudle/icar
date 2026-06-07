import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-claims";

/**
 * Cheap edge-level gate: redirect unauthenticated visitors away from /admin
 * before the server renders anything. This is NOT the security boundary —
 * the Firebase Admin SDK cannot run on the Edge runtime, so real session
 * verification happens server-side in the admin layout and every admin route
 * handler (see src/lib/auth.ts). This only avoids flashing protected UI.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/admin") && !isLogin && !hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
