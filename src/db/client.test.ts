import { describe, it, expect } from "vitest";
import { resolveConnectionPlan } from "./client";

describe("resolveConnectionPlan", () => {
  it("prefers LOCAL_DATABASE_URL for local/CI/test", () => {
    const plan = resolveConnectionPlan({
      LOCAL_DATABASE_URL: "postgres://u:p@localhost:5432/db",
    });
    expect(plan).toEqual({
      kind: "local",
      connectionString: "postgres://u:p@localhost:5432/db",
    });
  });

  it("selects IAM auth when DB_IAM_USER is set (no password in the plan)", () => {
    const plan = resolveConnectionPlan({
      CLOUD_SQL_INSTANCE: "proj:region:inst",
      DB_NAME: "screening",
      DB_IP_TYPE: "PRIVATE",
      DB_IAM_USER: "sa@proj.iam",
    });
    expect(plan).toMatchObject({
      kind: "cloud-sql",
      ipType: "PRIVATE",
      auth: { type: "IAM", user: "sa@proj.iam" },
    });
    // Ensure no password leaks into an IAM plan.
    expect(JSON.stringify(plan)).not.toContain("password");
  });

  it("falls back to password auth when DB_USER + DB_PASSWORD are set", () => {
    const plan = resolveConnectionPlan({
      CLOUD_SQL_INSTANCE: "proj:region:inst",
      DB_NAME: "screening",
      DB_USER: "postgres",
      DB_PASSWORD: "secret",
    });
    expect(plan).toMatchObject({
      kind: "cloud-sql",
      ipType: "PUBLIC", // defaults when DB_IP_TYPE unset
      auth: { type: "PASSWORD", user: "postgres", password: "secret" },
    });
  });

  it("throws when nothing is configured", () => {
    expect(() => resolveConnectionPlan({})).toThrow(
      /No database configured/,
    );
  });

  it("throws when Cloud SQL is set but no auth is provided", () => {
    expect(() =>
      resolveConnectionPlan({
        CLOUD_SQL_INSTANCE: "proj:region:inst",
        DB_NAME: "screening",
      }),
    ).toThrow(/auth not configured/);
  });
});
