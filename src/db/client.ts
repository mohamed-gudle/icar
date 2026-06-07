import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { Connector, IpAddressTypes, AuthTypes } from "@google-cloud/cloud-sql-connector";
import * as schema from "./schema";

/** The Drizzle client type, and a union that also accepts a transaction handle. */
export type Db = NodePgDatabase<typeof schema>;
export type DbExecutor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

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
  // A plain Postgres URL covers local dev, CI, and serverless Postgres
  // (Neon/Supabase/etc.). DATABASE_URL is the conventional name those
  // providers hand you; LOCAL_DATABASE_URL is honored for backward compat.
  const url = env.DATABASE_URL ?? env.LOCAL_DATABASE_URL;
  if (url) {
    return { kind: "local", connectionString: url };
  }

  const instance = env.CLOUD_SQL_INSTANCE;
  if (!instance) {
    throw new Error(
      "No database configured: set DATABASE_URL (e.g. Neon), LOCAL_DATABASE_URL, or CLOUD_SQL_INSTANCE.",
    );
  }
  const database = env.DB_NAME;
  if (!database) throw new Error("DB_NAME is required for Cloud SQL.");

  const rawIp = env.DB_IP_TYPE ?? "PUBLIC";
  if (rawIp !== "PUBLIC" && rawIp !== "PRIVATE" && rawIp !== "PSC") {
    throw new Error(
      `DB_IP_TYPE must be PUBLIC, PRIVATE, or PSC (got "${rawIp}")`,
    );
  }
  const ipType = rawIp;

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
let _initPromise: Promise<NodePgDatabase<typeof schema>> | undefined;

// Fast-fail instead of pg's default of waiting forever for a connection, so a
// stalled Cloud SQL handshake/token refresh cannot exhaust the pool silently.
const POOL_TUNING = { connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 };

async function createPool(plan: ConnectionPlan): Promise<pg.Pool> {
  if (plan.kind === "local") {
    // Serverless Postgres (Neon/Supabase) requires TLS; bare localhost does not.
    const cs = plan.connectionString;
    const needsSsl =
      /sslmode=(require|verify-full|verify-ca)/.test(cs) ||
      !/@(localhost|127\.0\.0\.1)[:/]/.test(cs);
    return new pg.Pool({
      connectionString: cs,
      max: 5,
      ...POOL_TUNING,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  }

  const connector = new Connector();
  try {
    const clientOpts = await connector.getOptions({
      instanceConnectionName: plan.instanceConnectionName,
      ipType: ipEnum(plan.ipType),
      authType: plan.auth.type === "IAM" ? AuthTypes.IAM : AuthTypes.PASSWORD,
    });
    const pool = new pg.Pool({
      ...clientOpts,
      user: plan.auth.user,
      ...(plan.auth.type === "PASSWORD" ? { password: plan.auth.password } : {}),
      database: plan.database,
      // Keep the per-instance pool small: maxInstances * max < Cloud SQL max_connections.
      max: 5,
      ...POOL_TUNING,
    });
    // Only adopt the connector once the pool exists, so a failed Pool
    // construction does not leak a connector + its token-refresh timer.
    _connector = connector;
    return pool;
  } catch (err) {
    connector.close();
    throw err;
  }
}

/**
 * Returns the shared Drizzle client, lazily initializing the pool once.
 * A promise singleton guards against concurrent cold-start callers each
 * creating their own pool/connector (which would leak connections on Cloud Run).
 */
export async function getDb(): Promise<NodePgDatabase<typeof schema>> {
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = (async () => {
      const plan = resolveConnectionPlan();
      _pool = await createPool(plan);
      _db = drizzle(_pool, { schema });
      return _db;
    })().catch((err) => {
      // Allow a later call to retry initialization after a transient failure.
      _initPromise = undefined;
      throw err;
    });
  }
  return _initPromise;
}

/** For graceful shutdown only (not per request). */
export async function closeDb(): Promise<void> {
  await _pool?.end();
  _connector?.close();
  _pool = undefined;
  _db = undefined;
  _connector = undefined;
  _initPromise = undefined;
}

export { schema };
