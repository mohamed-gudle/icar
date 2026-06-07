/**
 * Grant (or revoke) the admin custom claim for a Firebase user.
 * Creates the user (with a generated temp password) if it does not exist yet.
 *
 *   npm run set-admin -- user@example.com
 *   npm run set-admin -- user@example.com --revoke
 *
 * Requires Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS or ADC).
 */
import { randomBytes } from "node:crypto";
import { adminAuth } from "../src/lib/firebase-admin";

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");
  if (!email) {
    console.error("Usage: npm run set-admin -- <email> [--revoke]");
    process.exit(1);
  }

  const auth = adminAuth();

  let user;
  let tempPassword: string | null = null;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    if (
      revoke ||
      (err as { errorInfo?: { code?: string } })?.errorInfo?.code !==
        "auth/user-not-found"
    ) {
      throw err;
    }
    // Create the account so the admin can sign in (Email/Password provider must
    // be enabled in the Firebase console to actually log in).
    tempPassword = randomBytes(12).toString("base64url");
    user = await auth.createUser({ email, password: tempPassword, emailVerified: true });
  }

  await auth.setCustomUserClaims(user.uid, { admin: !revoke });
  // Revoke existing sessions so the new claim takes effect promptly.
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    `${revoke ? "Revoked" : "Granted"} admin for ${email} (uid ${user.uid}).`,
  );
  if (tempPassword) {
    console.log(`Created the account. Temporary password: ${tempPassword}`);
    console.log("Sign in with it at /admin, then change it. Enable Email/Password auth first.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
