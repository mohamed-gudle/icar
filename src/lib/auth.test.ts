import { describe, it, expect } from "vitest";
import { hasAdminClaim, sessionCookieMaxAgeMs } from "./auth-claims";

describe("hasAdminClaim", () => {
  it("is true only when admin === true", () => {
    expect(hasAdminClaim({ admin: true })).toBe(true);
  });

  it("is false for missing, falsy, or non-boolean-true claims", () => {
    expect(hasAdminClaim({})).toBe(false);
    expect(hasAdminClaim({ admin: false })).toBe(false);
    expect(hasAdminClaim({ admin: "true" })).toBe(false);
    expect(hasAdminClaim({ admin: 1 })).toBe(false);
    expect(hasAdminClaim(null)).toBe(false);
    expect(hasAdminClaim(undefined)).toBe(false);
  });
});

describe("sessionCookieMaxAgeMs", () => {
  it("uses ADMIN_SESSION_DAYS when valid", () => {
    expect(sessionCookieMaxAgeMs({ ADMIN_SESSION_DAYS: "2" })).toBe(
      2 * 86_400_000,
    );
  });

  it("defaults to 5 days when unset or invalid", () => {
    expect(sessionCookieMaxAgeMs({})).toBe(5 * 86_400_000);
    expect(sessionCookieMaxAgeMs({ ADMIN_SESSION_DAYS: "-1" })).toBe(
      5 * 86_400_000,
    );
    expect(sessionCookieMaxAgeMs({ ADMIN_SESSION_DAYS: "abc" })).toBe(
      5 * 86_400_000,
    );
  });
});
