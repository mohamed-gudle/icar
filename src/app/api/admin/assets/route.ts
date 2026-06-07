import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadAsset, isAllowedContentType } from "@/lib/storage";

export const runtime = "nodejs";

/** Admin-only server-side asset upload (multipart form, field "file"). */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (!isAllowedContentType(file.type)) {
    return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadAsset(buffer, file.type);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ path: result.path });
}
