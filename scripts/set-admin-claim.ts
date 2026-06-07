/**
 * Grant (or revoke) the admin custom claim for a Firebase user.
 *
 *   npm run set-admin -- user@example.com
 *   npm run set-admin -- user@example.com --revoke
 *
 * Requires Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS or ADC).
 */
import { adminAuth } from "../src/lib/firebase-admin";

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");
  if (!email) {
    console.error("Usage: npm run set-admin -- <email> [--revoke]");
    process.exit(1);
  }

  const auth = adminAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: !revoke });
  // Revoke existing sessions so the new claim takes effect promptly.
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    `${revoke ? "Revoked" : "Granted"} admin for ${email} (uid ${user.uid}).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
