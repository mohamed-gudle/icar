/**
 * Shared, environment-independent constants for the screening engine.
 * Kept free of I/O so it can be imported by both server code and unit tests.
 */

/** Total test duration. 12 minutes per spec. */
export const TEST_DURATION_MS = 12 * 60 * 1000;

/**
 * Grace window added to the hard limit on submission to absorb legitimate
 * network latency / clock-tick lag. Submissions within limit+grace are accepted
 * and NOT flagged; beyond it they are accepted-but-flagged (`over_time`).
 */
export const SUBMIT_GRACE_MS = 10 * 1000;

/** ICAR item types served by this screen (verbal intentionally excluded). */
export const ICAR_TYPES = ["matrix", "rotation", "series"] as const;
export type IcarType = (typeof ICAR_TYPES)[number];

/** Items drawn per type → 4 × 3 = 12 total. */
export const ITEMS_PER_TYPE = 4;
export const TOTAL_ITEMS = ITEMS_PER_TYPE * ICAR_TYPES.length;

/** Default invite-link expiry if the admin does not override. */
export const DEFAULT_INVITE_EXPIRY_DAYS = 7;

/** Session statuses. */
export const SESSION_STATUS = {
  inProgress: "in_progress",
  submitted: "submitted",
  expired: "expired",
} as const;

/** Access-token statuses. */
export const TOKEN_STATUS = {
  unused: "unused",
  consumed: "consumed",
  expired: "expired",
} as const;
