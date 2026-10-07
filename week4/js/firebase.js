/**
 * Firebase Modular SDK v10+ Initialization
 *
 * Reads config from Vite environment variables (defined in .env).
 * Supports connecting to Firebase Emulator Suite when VITE_USE_FIREBASE_EMULATOR is true.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// .env is gitignored, so a build run anywhere without it (CI, a fresh clone)
// inlines `undefined` for every value and every auth call fails with an opaque
// invalid-api-key. Say so up front instead.
const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  console.error(
    `[Prayer Board] Missing Firebase config: ${missingConfig.join(', ')}. ` +
      'Copy .env.example to .env, fill in the values from the Firebase console, then restart the dev server.'
  );
}

// Initialize Firebase Core
export const app = initializeApp(firebaseConfig);

// Initialize Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to Emulator Suite if enabled
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
if (useEmulator) {
  const authUrl = import.meta.env.VITE_EMULATOR_AUTH_URL || 'http://localhost:9099';
  const firestoreHost = import.meta.env.VITE_EMULATOR_FIRESTORE_HOST || 'localhost';
  const firestorePort = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT) || 8080;

  try {
    connectAuthEmulator(auth, authUrl, { disableWarnings: true });
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
    console.info(`[Prayer Board] Connected to Firebase Emulators (Auth: ${authUrl}, Firestore: ${firestoreHost}:${firestorePort})`);
  } catch (err) {
    console.warn('[Prayer Board] Notice connecting to emulator:', err);
  }
}
