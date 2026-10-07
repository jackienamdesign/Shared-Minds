/**
 * Phase 1: Authentication & User Profile Sync
 *
 * Implements:
 * - Email / Password sign-in & sign-up
 * - Google popup sign-in
 * - Display name persistence on profile & Firestore
 * - First sign-in Firestore doc creation at users/{uid}
 * - Auth state observer with protected screen transitions
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// createUserWithEmailAndPassword fires onAuthStateChanged before updateProfile
// has run, so the listener's ensureUserDoc() would otherwise create users/{uid}
// with a name derived from the email instead of the one typed at sign up.
// Signup parks the chosen name here so whichever call lands first uses it.
let pendingDisplayName = null;

/**
 * Ensures a user document exists in users/{uid} on first sign in
 */
export async function ensureUserDoc(user, explicitDisplayName) {
  if (!user || !user.uid) return null;

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    const displayName =
      explicitDisplayName ||
      pendingDisplayName ||
      user.displayName ||
      (user.email ? user.email.split('@')[0] : 'Kind Neighbor');

    if (!snap.exists()) {
      const initialDoc = {
        displayName: displayName,
        email: user.email || '',
        createdAt: serverTimestamp(),
        prayersOffered: 0,
        peoplePrayedFor: 0,
      };
      await setDoc(userRef, initialDoc);
      return { id: user.uid, ...initialDoc };
    } else {
      const existing = snap.data();
      // Repair the name if the auth listener won the race above and stored an
      // email-derived placeholder before signup supplied the real one.
      if (explicitDisplayName && existing.displayName !== explicitDisplayName) {
        await setDoc(userRef, { displayName: explicitDisplayName }, { merge: true });
        return { id: user.uid, ...existing, displayName: explicitDisplayName };
      }
      return { id: user.uid, ...existing };
    }
  } catch (err) {
    console.warn('[Prayer Board] Firestore user doc notice:', err);
    return {
      id: user.uid,
      displayName: explicitDisplayName || user.displayName || 'Kind Neighbor',
      prayersOffered: 0,
      peoplePrayedFor: 0,
    };
  }
}

/**
 * Register a new user with email, password, and display name
 */
export async function signUpWithEmail(email, password, displayName) {
  const cleanName = (displayName || '').trim() || 'Kind Neighbor';
  pendingDisplayName = cleanName;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Set Auth display name
    await updateProfile(cred.user, { displayName: cleanName });

    // Create users/{uid} doc in Firestore
    const profile = await ensureUserDoc(cred.user, cleanName);
    return { user: cred.user, profile };
  } finally {
    pendingDisplayName = null;
  }
}

/**
 * Sign in with existing email and password
 */
export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserDoc(cred.user);
  return { user: cred.user, profile };
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const profile = await ensureUserDoc(cred.user);
  return { user: cred.user, profile };
}

/**
 * Sign out
 */
export async function signOutUser() {
  await signOut(auth);
}

/**
 * Initialize Auth State Listener
 */
export function initAuthListener(onStateChange) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await ensureUserDoc(user);
      onStateChange({ user, profile, isSignedIn: true });
    } else {
      onStateChange({ user: null, profile: null, isSignedIn: false });
    }
  });
}
