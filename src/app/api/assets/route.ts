import { type NextRequest, NextResponse } from "next/server";
import { downloadAsset } from "@/lib/storage";
import { getAdmin } from "@/lib/auth";
import { CANDIDATE_COOKIE, verifySession } from "@/lib/candidate-session";

export const runtime = "nodejs";

/**
 * Server-mediated asset serving. The bucket is private (storage.rules denies
 * all client access); images flow only through here, gated to an authenticated
 * candidate session or an admin. Path is constrained to the questions prefix to
 * prevent traversal / arbitrary-object reads.
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!path.startsWith("questions/") || path.includes("..")) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const candidate = verifySession(req.cookies.get(CANDIDATE_COOKIE)?.value);
  const admin = candidate ? null : await getAdmin();
  if (!candidate && !admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const asset = await downloadAsset(path);
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(asset.buffer), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
