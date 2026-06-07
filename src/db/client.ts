import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { Connector, IpAddressTypes, AuthTypes } from "@google-cloud/cloud-sql-connector";
import * as schema from "./schema";

/**
 * Pure, testable resolution of how to connect, based on environment.
 *
 *  - LOCAL_DATABASE_URL  -> plain pg connection string (local dev / CI / tests)
 *  - CLOUD_SQL_INSTANCE  -> Cloud SQL connector (IAM auth if DB_IAM_USER set,
 *                           otherwise password auth via DB_USER/DB_PASSWORD)
 */
export type ConnectionPlan =
  | { kind: "local"; connectionString: string }
  | {
      kind: "cloud-sql";
      instanceConnectionName: string;
      ipType: "PUBLIC" | "PRIVATE" | "PSC";
      database: string;
      auth:
        | { type: "IAM"; user: string }
        | { type: "PASSWORD"; user: string; password: string };
    };

export function resolveConnectionPlan(
  env: Record<string, string | undefined> = process.env,
): ConnectionPlan {
  if (env.LOCAL_DATABASE_URL) {
    return { kind: "local", connectionString: env.LOCAL_DATABASE_URL };
  }

  const instance = env.CLOUD_SQL_INSTANCE;
  if (!instance) {
    throw new Error(
      "No database configured: set LOCAL_DATABASE_URL or CLOUD_SQL_INSTANCE.",
    );
  }
  const database = env.DB_NAME;
  if (!database) throw new Error("DB_NAME is required for Cloud SQL.");

  const ipType = (env.DB_IP_TYPE ?? "PUBLIC") as "PUBLIC" | "PRIVATE" | "PSC";

  if (env.DB_IAM_USER) {
    return {
      kind: "cloud-sql",
      instanceConnectionName: instance,
      ipType,
      database,
      auth: { type: "IAM", user: env.DB_IAM_USER },
    };
  }
  if (env.DB_USER && env.DB_PASSWORD) {
    return {
      kind: "cloud-sql",
      instanceConnectionName: instance,
      ipType,
      database,
      auth: { type: "PASSWORD", user: env.DB_USER, password: env.DB_PASSWORD },
    };
  }
  throw new Error(
    "Cloud SQL auth not configured: set DB_IAM_USER (IAM) or DB_USER+DB_PASSWORD.",
  );
}

function ipEnum(ip: "PUBLIC" | "PRIVATE" | "PSC"): IpAddressTypes {
  switch (ip) {
    case "PRIVATE":
      return IpAddressTypes.PRIVATE;
    case "PSC":
      return IpAddressTypes.PSC;
    default:
      return IpAddressTypes.PUBLIC;
  }
}

// --- module-scoped singletons (one pool/connector per Cloud Run instance) ---
let _pool: pg.Pool | undefined;
let _db: NodePgDatabase<typeof schema> | undefined;
let _connector: Connector | undefined;

async function createPool(plan: ConnectionPlan): Promise<pg.Pool> {
  if (plan.kind === "local") {
    return new pg.Pool({ connectionString: plan.connectionString, max: 5 });
  }

  _connector = new Connector();
  const clientOpts = await _connector.getOptions({
    instanceConnectionName: plan.instanceConnectionName,
    ipType: ipEnum(plan.ipType),
    authType: plan.auth.type === "IAM" ? AuthTypes.IAM : AuthTypes.PASSWORD,
  });

  return new pg.Pool({
    ...clientOpts,
    user: plan.auth.user,
    ...(plan.auth.type === "PASSWORD" ? { password: plan.auth.password } : {}),
    database: plan.database,
    // Keep the per-instance pool small: maxInstances * max < Cloud SQL max_connections.
    max: 5,
  });
}

/**
 * Returns the shared Drizzle client, lazily initializing the pool once.
 * Safe to call per-request; the underlying pool is reused across warm invocations.
 */
export async function getDb(): Promise<NodePgDatabase<typeof schema>> {
  if (_db) return _db;
  const plan = resolveConnectionPlan();
  _pool = await createPool(plan);
  _db = drizzle(_pool, { schema });
  return _db;
}

/** For graceful shutdown only (not per request). */
export async function closeDb(): Promise<void> {
  await _pool?.end();
  _connector?.close();
  _pool = undefined;
  _db = undefined;
  _connector = undefined;
}

export { schema };
