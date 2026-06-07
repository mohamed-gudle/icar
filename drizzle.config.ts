import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// drizzle-kit runs standalone (unlike Next.js) and does not auto-load env files,
// so load them here. .env.local wins over .env, matching Next.js conventions.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// drizzle-kit runs at build/CI time against a directly reachable Postgres
// (local URL or the Cloud SQL Auth Proxy). It does not use the runtime
// cloud-sql-connector. Never run migrations from request handlers / app boot.
// Precedence matches src/db/client.ts: DATABASE_URL (Neon/serverless) wins over
// the local fallback so a stray LOCAL_DATABASE_URL from .env.example can't
// silently redirect migrations to localhost.
const url =
  process.env.DATABASE_URL ??
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
