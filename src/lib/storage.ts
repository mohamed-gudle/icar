import { randomUUID } from "node:crypto";
import { adminStorage } from "./firebase-admin";

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function isAllowedContentType(ct: string): boolean {
  return ct in ALLOWED;
}

export function extensionFor(contentType: string): string | null {
  return ALLOWED[contentType] ?? null;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

/** Upload a question asset to Storage via the Admin SDK (server-side only). */
export async function uploadAsset(
  buffer: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const ext = extensionFor(contentType);
  if (!ext) return { ok: false, error: "unsupported file type" };
  if (buffer.byteLength > MAX_BYTES) {
    return { ok: false, error: "file too large (max 5MB)" };
  }
  const path = `questions/${randomUUID()}.${ext}`;
  await adminStorage()
    .bucket()
    .file(path)
    .save(buffer, { contentType, resumable: false });
  return { ok: true, path };
}

export type AssetDownload = { buffer: Buffer; contentType: string };

/** Fetch an asset for server-mediated serving. Returns null if missing. */
export async function downloadAsset(path: string): Promise<AssetDownload | null> {
  const file = adminStorage().bucket().file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [meta] = await file.getMetadata();
  const [buffer] = await file.download();
  return {
    buffer,
    contentType: meta.contentType ?? "application/octet-stream",
  };
}
