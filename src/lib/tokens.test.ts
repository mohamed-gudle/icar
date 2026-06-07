import { describe, it, expect } from "vitest";
import { generateToken, hashToken, buildInviteUrl } from "./tokens";

describe("generateToken", () => {
  it("returns a fresh, high-entropy, url-safe raw token each call", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.raw).not.toBe(b.raw);
    // 32 bytes base64url ≈ 43 chars, no padding, url-safe alphabet only.
    expect(a.raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("stores the hash, never the raw token", () => {
    const { raw, hash } = generateToken();
    expect(hash).toBe(hashToken(raw));
    expect(hash).not.toBe(raw);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashToken", () => {
  it("is deterministic and collision-distinct", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("buildInviteUrl", () => {
  it("builds a /test?token= URL and trims a trailing slash", () => {
    expect(buildInviteUrl("https://x.app/", "tok")).toBe(
      "https://x.app/test?token=tok",
    );
  });

  it("url-encodes the token", () => {
    expect(buildInviteUrl("https://x.app", "a b/c")).toBe(
      "https://x.app/test?token=a%20b%2Fc",
    );
  });
});
