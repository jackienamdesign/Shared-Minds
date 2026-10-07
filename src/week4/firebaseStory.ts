import {
  signInAnonymously,
  onAuthStateChanged,
  updateProfile,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserAccount, StoryWorld, StoryFrame } from './types';
import { SEED_AGENTS, INITIAL_WORLDS, INITIAL_FRAMES } from './seedData';

const LOCAL_USER_KEY = 'sm_w4_user_account';
const LOCAL_WORLDS_KEY = 'sm_w4_worlds_cache';
const LOCAL_FRAMES_KEY = 'sm_w4_frames_cache';

// Load stored local worlds and frames for immediate display / offline resilience
export function getLocalWorlds(): StoryWorld[] {
  try {
    const raw = localStorage.getItem(LOCAL_WORLDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local worlds', e);
  }
  return INITIAL_WORLDS;
}

export function saveLocalWorlds(worlds: StoryWorld[]) {
  try {
    localStorage.setItem(LOCAL_WORLDS_KEY, JSON.stringify(worlds));
  } catch {
    // ignore
  }
}

export function getLocalFrames(): Record<string, StoryFrame[]> {
  try {
    const raw = localStorage.getItem(LOCAL_FRAMES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local frames', e);
  }
  return INITIAL_FRAMES;
}

export function saveLocalFrames(frames: Record<string, StoryFrame[]>) {
  try {
    localStorage.setItem(LOCAL_FRAMES_KEY, JSON.stringify(frames));
  } catch {
    // ignore
  }
}

/**
 * Creates or gets the active user account.
 * Supports:
 *  1. Firebase Anonymous Auth + user profile
 *  2. Name volunteer prompt fallback if Firebase Auth is unavailable or restricted
 */
export function getSavedUser(): UserAccount {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  // Default initial guest account
  const initialGuest: UserAccount = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    name: 'Curious Storyteller',
    handle: '@storyteller_' + Math.floor(Math.random() * 900 + 100),
    avatar: '🎨',
    bio: 'Exploring and expanding parallel story worlds.',
    reputation: 100,
    badges: ['Pioneer', 'Frame Weaver'],
    isAgent: false,
    role: 'human',
    joinedAt: Date.now(),
  };
  saveUser(initialGuest);
  return initialGuest;
}

export function saveUser(user: UserAccount) {
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

/**
 * Prompt volunteer fallback: Ask user for their creative identity
 */
export function volunteerIdentity(existingUser?: UserAccount): UserAccount {
  const currentName = existingUser ? existingUser.name : 'Curious Storyteller';
  const input = window.prompt(
    'Volunteer your name or moniker for story accountability & reputation:',
    currentName
  );

  const finalName = input && input.trim() ? input.trim() : currentName;
  const avatars = ['🎨', '🐧', '🚀', '🌌', '✒️', '🎬', '⚡', '🌙', '🎭', '✨'];
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];

  const updated: UserAccount = {
    id: existingUser?.id || 'user_' + Math.random().toString(36).substring(2, 9),
    name: finalName,
    handle: '@' + finalName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 16),
    avatar: existingUser?.avatar || avatar,
    bio: existingUser?.bio || 'Collaborative comic narrator building on Shared Minds.',
    reputation: (existingUser?.reputation || 100) + 20, // +20 reputation for volunteering
    badges: Array.from(new Set([...(existingUser?.badges || []), 'Accountable Storyteller'])),
    isAgent: false,
    role: 'human',
    joinedAt: existingUser?.joinedAt || Date.now(),
  };

  saveUser(updated);

  // If Firebase Auth is signed in, update profile displayName
  if (auth.currentUser) {
    updateProfile(auth.currentUser, { displayName: finalName }).catch(() => {});
  }

  return updated;
}

/**
 * Initializes Firebase Authentication listener with fallback
 */
export function setupAuthListener(onUserChanged: (user: UserAccount) => void) {
  let currentUser = getSavedUser();
  onUserChanged(currentUser);

  // Try signing in anonymously with Firebase Auth if not already signed in
  onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      if (fbUser.displayName && fbUser.displayName !== currentUser.name) {
        currentUser = {
          ...currentUser,
          name: fbUser.displayName,
          handle: '@' + fbUser.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        };
        saveUser(currentUser);
        onUserChanged(currentUser);
      }
    } else {
      // Attempt anonymous sign-in in background
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn('Firebase Anonymous Auth notice (using client volunteer profile):', err);
      }
    }
  });
}

/**
 * Real-time subscription to Story Worlds
 */
export function subscribeToWorlds(callback: (worlds: StoryWorld[]) => void) {
  // First callback immediately with cached / seeded worlds (0ms perceived latency)
  const currentLocal = getLocalWorlds();
  callback(currentLocal);

  try {
    const q = query(collection(db, 'story_worlds'), orderBy('updatedAt', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteWorlds: StoryWorld[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<StoryWorld, 'id'>),
          }));

          // Merge with initial seed worlds so demo worlds are always present
          const mergedMap = new Map<string, StoryWorld>();
          INITIAL_WORLDS.forEach((w) => mergedMap.set(w.id, w));
          remoteWorlds.forEach((w) => mergedMap.set(w.id, w));
          const list = Array.from(mergedMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
          saveLocalWorlds(list);
          callback(list);
        }
      },
      (error) => {
        console.warn('Firestore story_worlds sync fallback to local cache:', error);
      }
    );
  } catch (err) {
    console.warn('Firestore subscription failed, keeping local worlds:', err);
    return () => {};
  }
}

/**
 * Real-time subscription to Story Frames for a specific world
 */
export function subscribeToFrames(
  worldId: string,
  callback: (frames: StoryFrame[]) => void
) {
  const allLocal = getLocalFrames();
  const currentFrames = allLocal[worldId] || [];
  callback(currentFrames);

  try {
    const q = query(
      collection(db, `story_worlds/${worldId}/frames`),
      orderBy('sequenceIndex', 'asc'),
      limit(100)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteFrames: StoryFrame[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<StoryFrame, 'id'>),
          }));

          const updatedLocal = { ...getLocalFrames(), [worldId]: remoteFrames };
          saveLocalFrames(updatedLocal);
          callback(remoteFrames);
        }
      },
      (error) => {
        console.warn(`Firestore frames sync for world ${worldId} fallback:`, error);
      }
    );
  } catch (err) {
    console.warn('Firestore frames listener error:', err);
    return () => {};
  }
}

/**
 * Create a new Story World
 */
export async function createStoryWorld(
  worldData: Omit<StoryWorld, 'id' | 'createdAt' | 'updatedAt' | 'framesCount' | 'branchesCount' | 'starsCount'>
): Promise<StoryWorld> {
  const newId = 'world_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = Date.now();

  const newWorld: StoryWorld = {
    ...worldData,
    id: newId,
    framesCount: 0,
    branchesCount: 0,
    starsCount: 1,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Immediately update local cache for zero latency
  const current = getLocalWorlds();
  const updated = [newWorld, ...current];
  saveLocalWorlds(updated);

  // 2. Sync to Firestore in background
  try {
    await setDoc(doc(db, 'story_worlds', newId), {
      ...newWorld,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore world creation deferred locally:', err);
  }

  return newWorld;
}

/**
 * Append a new frame to a story world (or branch from an existing frame)
 */
export async function addStoryFrame(
  worldId: string,
  frameData: Omit<StoryFrame, 'id' | 'storyId' | 'createdAt' | 'likes'>
): Promise<StoryFrame> {
  const frameId = 'frame_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = Date.now();

  const newFrame: StoryFrame = {
    ...frameData,
    id: frameId,
    storyId: worldId,
    createdAt: now,
    likes: 1,
  };

  // 1. Update local frames cache immediately
  const allLocal = getLocalFrames();
  const worldFrames = allLocal[worldId] ? [...allLocal[worldId], newFrame] : [newFrame];
  allLocal[worldId] = worldFrames;
  saveLocalFrames(allLocal);

  // Update world frame counter locally
  const worlds = getLocalWorlds().map((w) => {
    if (w.id === worldId) {
      return {
        ...w,
        framesCount: w.framesCount + 1,
        thumbnailFrame: newFrame.imageUrl,
        updatedAt: now,
      };
    }
    return w;
  });
  saveLocalWorlds(worlds);

  // 2. Sync to Firestore in background
  try {
    await setDoc(doc(db, `story_worlds/${worldId}/frames`, frameId), {
      ...newFrame,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'story_worlds', worldId), {
      framesCount: increment(1),
      thumbnailFrame: newFrame.imageUrl,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore frame sync deferred locally:', err);
  }

  return newFrame;
}

/**
 * Upvote a frame (increases frame likes + author reputation)
 */
export async function likeStoryFrame(worldId: string, frameId: string, authorId: string) {
  // Update local cache
  const allFrames = getLocalFrames();
  if (allFrames[worldId]) {
    allFrames[worldId] = allFrames[worldId].map((f) => {
      if (f.id === frameId) {
        return { ...f, likes: f.likes + 1 };
      }
      return f;
    });
    saveLocalFrames(allFrames);
  }

  // Background Firestore sync
  try {
    await updateDoc(doc(db, `story_worlds/${worldId}/frames`, frameId), {
      likes: increment(1),
    });
    await updateDoc(doc(db, 'story_worlds', worldId), {
      starsCount: increment(1),
    });
  } catch (e) {
    // Ignore offline errors
  }
}
