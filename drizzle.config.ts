import { defineConfig } from "drizzle-kit";

// drizzle-kit runs at build/CI time against a directly reachable Postgres
// (local URL or the Cloud SQL Auth Proxy). It does not use the runtime
// cloud-sql-connector. Never run migrations from request handlers / app boot.
const url =
  process.env.LOCAL_DATABASE_URL ??
  process.env.MIGRATION_DATABASE_URL ??
  "";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
});
