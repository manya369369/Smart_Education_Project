/**
 * Firebase Configuration — Safe Production Setup
 *
 * Firebase is initialized only when all required VITE_FIREBASE_*
 * environment variables are available.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Required Firebase environment variables
const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const missingVars = requiredEnvVars.filter(
  (variableName) => !import.meta.env[variableName]?.trim()
);

export const isFirebaseConfigured = missingVars.length === 0;

let app = null;
let auth = null;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY.trim(),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN.trim(),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID.trim(),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET.trim(),
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID.trim(),
    appId: import.meta.env.VITE_FIREBASE_APP_ID.trim(),
  };

  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    console.log("[Firebase] Authentication initialized successfully.");
  } catch (error) {
    console.error("[Firebase] Initialization failed:", error);
    app = null;
    auth = null;
  }
} else {
  console.error(
    "[Firebase] Configuration is incomplete. Missing variables:",
    missingVars
  );
}

export { app, auth };
export default app;