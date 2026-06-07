import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

/**
 * Lazy, idempotent Firebase Admin SDK initialization.
 *
 * On App Hosting / Cloud Run, Application Default Credentials are used
 * automatically. For local dev, point GOOGLE_APPLICATION_CREDENTIALS at a
 * downloaded service-account key (handled by applicationDefault()).
 */
function adminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  // Allow an inline JSON service account (e.g. some CI setups) as an option.
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = inline
    ? cert(JSON.parse(inline))
    : applicationDefault();

  return initializeApp({ credential, projectId, storageBucket });
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminStorage(): Storage {
  return getStorage(adminApp());
}
