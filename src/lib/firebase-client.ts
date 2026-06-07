"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

function readConfig() {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!raw) {
    throw new Error("NEXT_PUBLIC_FIREBASE_CONFIG is not set");
  }
  return JSON.parse(raw) as {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    appId: string;
  };
}

let _app: FirebaseApp | undefined;

export function clientApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApps()[0] : initializeApp(readConfig());
  return _app;
}

export function clientAuth(): Auth {
  return getAuth(clientApp());
}
