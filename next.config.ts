import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Firebase Admin SDK and pg/cloud-sql-connector are server-only native deps.
  // Keep them external so Next does not try to bundle them into server chunks.
  serverExternalPackages: [
    "firebase-admin",
    "pg",
    "@google-cloud/cloud-sql-connector",
  ],
  experimental: {
    // Server Actions are used for some admin mutations.
    serverActions: {
      bodySizeLimit: "8mb", // allow image asset uploads through actions
    },
  },
};

export default nextConfig;
