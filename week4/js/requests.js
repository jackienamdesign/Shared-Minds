/**
 * Phase 2: Prayer Request Data Layer
 *
 * Every Firestore read and write for the board lives here so that board.js
 * stays presentational. Counters go through transactions / increment() so they
 * stay correct when many people pray at the same moment.
 *
 * Collections
 *   requests/{requestId}                  public card copy, readable by any signed-in user
 *   requests/{requestId}/private/stats    prayerCount, readable ONLY by the author
 *   requests/{requestId}/prayers/{uid}    prayedAt, one doc per person per request
 *   users/{uid}/prayedFor/{authorId}      firstPrayedAt, powers the unique-people stat
 *
 * NOTE ON prayerCount: the brief lists prayerCount on requests/{requestId}, but
 * also requires it be readable only by the author. Firestore rules grant access
 * per document, never per field, so a count stored on the publicly-readable card
 * is readable by everyone who can read the card — the privacy promise would be
 * cosmetic. It lives in the private/stats child doc instead, which rules can
 * genuinely restrict to the author while still letting others increment it.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  writeBatch,
  runTransaction,
  serverTimestamp,
  increment,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase.js';

export const PAGE_SIZE = 20;
export const MAX_TEXT = 500;

/** A prayer may be offered once per request per day. */
const PRAYER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const CATEGORIES = [
  { id: 'health', label: 'Health', emoji: '🌿' },
  { id: 'family', label: 'Family', emoji: '🏡' },
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'school', label: 'School', emoji: '📚' },
  { id: 'grief', label: 'Grief', emoji: '🕊️' },
  { id: 'gratitude', label: 'Gratitude', emoji: '🌷' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function categoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

// ============================================================================
// Creating a request
// ============================================================================

/**
 * Posts a new prayer request. The public card and its private stats doc are
 * written as one batch so a card can never exist without somewhere to count.
 */
export async function createRequest({ text, category, isAnonymous, displayName }) {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to share a request.');

  const clean = (text || '').trim();
  if (!clean) throw new Error('Please write a little about what you need prayer for.');
  if (clean.length > MAX_TEXT) {
    throw new Error(`Please keep your request under ${MAX_TEXT} characters.`);
  }
  const cat = CATEGORY_IDS.includes(category) ? category : 'other';

  const requestRef = doc(collection(db, 'requests'));
  const statsRef = doc(db, 'requests', requestRef.id, 'private', 'stats');

  const card = {
    authorId: user.uid,
    // Stored denormalised so the board needs no extra read per card. Anonymous
    // posts still record the real authorId (rules need it) but carry no name.
    authorName: isAnonymous ? '' : displayName || user.displayName || 'Kind Neighbour',
    isAnonymous: !!isAnonymous,
    text: clean,
    category: cat,
    status: 'open',
    createdAt: serverTimestamp(),
    reportCount: 0,
  };

  const batch = writeBatch(db);
  batch.set(requestRef, card);
  batch.set(statsRef, { prayerCount: 0 });
  await batch.commit();

  return { id: requestRef.id, ...card, createdAt: Timestamp.now() };
}

// ============================================================================
// Reading the board (cursor pagination)
// ============================================================================

/**
 * Fetches one page of cards, newest first.
 *
 * `cursor` is the raw QueryDocumentSnapshot from the previous page — Firestore
 * cursors need the snapshot, not a plain object, so callers hold onto it.
 * Returns the cursor for the next call plus whether more pages likely remain.
 */
export async function fetchRequestPage(cursor = null) {
  const parts = [
    collection(db, 'requests'),
    // Phase 4 hides reported cards. Kept as an equality-free client filter for
    // now: an inequality on reportCount plus orderBy(createdAt) would need a
    // composite index, which is not worth adding until reports actually exist.
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  ];
  if (cursor) parts.push(startAfter(cursor));

  const snap = await getDocs(query(...parts));
  const cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    cards,
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : cursor,
    // A short page means the end of the collection. A full page might still be
    // the last one; the next fetch returning nothing settles it.
    hasMore: snap.docs.length === PAGE_SIZE,
    readCount: snap.docs.length,
  };
}

/**
 * Which of these requests the signed-in user has already prayed for today.
 *
 * One query against the user's own mirror of their prayers rather than a
 * getDoc per card — that turns 20 reads per page into 1. Returns a Set of
 * request ids still inside the cooldown window.
 */
export async function fetchMyRecentPrayers() {
  const user = auth.currentUser;
  if (!user) return new Set();

  const since = Timestamp.fromMillis(Date.now() - PRAYER_COOLDOWN_MS);
  try {
    const snap = await getDocs(
      query(collection(db, 'users', user.uid, 'prayers'), where('prayedAt', '>', since))
    );
    return new Set(snap.docs.map((d) => d.id));
  } catch (err) {
    console.warn('[Prayer Board] Could not load your recent prayers:', err);
    return new Set();
  }
}

/** Private prayer counts for the signed-in user's own cards, fetched on demand. */
export async function fetchMyCardStats(requestIds) {
  const user = auth.currentUser;
  if (!user || !requestIds.length) return {};

  const entries = await Promise.all(
    requestIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'requests', id, 'private', 'stats'));
        return [id, snap.exists() ? snap.data().prayerCount || 0 : 0];
      } catch {
        return [id, 0];
      }
    })
  );
  return Object.fromEntries(entries);
}

// ============================================================================
// Praying for a request
// ============================================================================

/**
 * Records a prayer and advances every counter that depends on it, atomically.
 *
 * Touches five documents in one transaction:
 *   - requests/{id}/prayers/{uid}        the once-per-day guard
 *   - users/{uid}/prayers/{requestId}    the user's own mirror (cheap lookups)
 *   - requests/{id}/private/stats        author-visible prayerCount
 *   - users/{uid}                        prayersOffered, and peoplePrayedFor
 *   - users/{uid}/prayedFor/{authorId}   first time praying for this person
 *
 * Throws with code 'cooldown' if the user already prayed for this card today.
 */
export async function prayForRequest(requestId, authorId) {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to pray.');

  const prayerRef = doc(db, 'requests', requestId, 'prayers', user.uid);
  const mirrorRef = doc(db, 'users', user.uid, 'prayers', requestId);
  const statsRef = doc(db, 'requests', requestId, 'private', 'stats');
  const userRef = doc(db, 'users', user.uid);
  const prayedForRef = doc(db, 'users', user.uid, 'prayedFor', authorId);

  await runTransaction(db, async (tx) => {
    // All reads must precede all writes inside a Firestore transaction.
    const existing = await tx.get(prayerRef);
    const alreadyKnowsAuthor = authorId === user.uid ? null : await tx.get(prayedForRef);

    if (existing.exists()) {
      const last = existing.data().prayedAt;
      const lastMs = last?.toMillis ? last.toMillis() : 0;
      if (Date.now() - lastMs < PRAYER_COOLDOWN_MS) {
        const err = new Error('You have already held this in prayer today.');
        err.code = 'cooldown';
        throw err;
      }
    }

    tx.set(prayerRef, { prayedAt: serverTimestamp() });
    tx.set(mirrorRef, { prayedAt: serverTimestamp(), authorId });
    tx.set(statsRef, { prayerCount: increment(1) }, { merge: true });

    // Praying for your own card should not inflate your own journey stats.
    if (authorId !== user.uid) {
      const isNewPerson = alreadyKnowsAuthor && !alreadyKnowsAuthor.exists();
      if (isNewPerson) {
        tx.set(prayedForRef, { firstPrayedAt: serverTimestamp() });
      }
      tx.set(
        userRef,
        {
          prayersOffered: increment(1),
          ...(isNewPerson ? { peoplePrayedFor: increment(1) } : {}),
        },
        { merge: true }
      );
    }
  });
}

// ============================================================================
// Author-only actions
// ============================================================================

/** Marks the author's own request as answered, or reopens it. */
export async function setRequestStatus(requestId, status) {
  if (!['open', 'answered'].includes(status)) {
    throw new Error(`Unknown status: ${status}`);
  }
  await updateDoc(doc(db, 'requests', requestId), { status });
}

/**
 * Deletes the author's own request.
 *
 * Firestore does not cascade. The private stats doc is removed here; the
 * prayers subcollection is left behind because a client cannot be trusted to
 * (or allowed to) walk an unbounded subcollection. In a deployed app that is a
 * Cloud Function on delete — noted in SCALE_NOTES for the scale-testing phase.
 */
export async function deleteRequest(requestId) {
  await deleteDoc(doc(db, 'requests', requestId, 'private', 'stats')).catch(() => {});
  await deleteDoc(doc(db, 'requests', requestId));
}

// ============================================================================
// Formatting helpers
// ============================================================================

/** Warm relative time. Firestore timestamps are null for a beat after write. */
export function relativeTime(timestamp) {
  if (!timestamp) return 'just now';
  const ms = timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime();
  const diff = Date.now() - ms;

  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return 'a while ago';
}

/** Gentle, non-numeric-feeling phrasing for the author's private count line. */
export function heldInPrayerCopy(count) {
  if (!count) return 'Your request is resting here quietly.';
  if (count === 1) return '1 person held this in prayer 🕯️';
  return `${count} people held this in prayer 🕯️`;
}
