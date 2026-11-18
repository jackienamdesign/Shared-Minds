/**
 * Firebase Modular SDK v10+ Initialization
 *
 * Uses the site's shared Firebase config (src/firebase-config.ts). Any value
 * set in .env overrides it, e.g. to point at a different project.
 * Supports connecting to Firebase Emulator Suite when VITE_USE_FIREBASE_EMULATOR is true.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

import { firebaseConfig as sharedConfig } from '../../src/firebase-config';

// .env is gitignored, so the GitHub Pages build has none of these. It used to
// inline `undefined` for every value and the live board failed with
// invalid-api-key; falling back to the shared config keeps it working there.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || sharedConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || sharedConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || sharedConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || sharedConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || sharedConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || sharedConfig.appId,
};

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
