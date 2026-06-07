import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./candidate-session";

const env = { CANDIDATE_COOKIE_SECRET: "test-secret" };
const other = { CANDIDATE_COOKIE_SECRET: "different-secret" };

describe("candidate session cookie", () => {
  it("round-trips a session id", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const signed = signSession(id, env);
    expect(verifySession(signed, env)).toBe(id);
  });

  it("rejects a tampered signature", () => {
    const id = "abc";
    const signed = signSession(id, env);
    const tampered = signed.slice(0, -1) + (signed.endsWith("0") ? "1" : "0");
    expect(verifySession(tampered, env)).toBeNull();
  });

  it("rejects a forged id with someone else's signature", () => {
    const signed = signSession("victim", env);
    const forged = "attacker." + signed.split(".")[1];
    expect(verifySession(forged, env)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const signed = signSession("abc", other);
    expect(verifySession(signed, env)).toBeNull();
  });

  it("rejects malformed/empty values", () => {
    expect(verifySession(undefined, env)).toBeNull();
    expect(verifySession("", env)).toBeNull();
    expect(verifySession("no-dot", env)).toBeNull();
    expect(verifySession(".onlymac", env)).toBeNull();
  });
});
