import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import { firebaseConfig } from './firebase-config';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * One finished Pingu on the shared strip.
 *
 * Only the generated Pingu is shared — the visitor's webcam capture never
 * leaves their browser. pinguUrl is the image itself as a JPEG data URL,
 * because the model's own URL expires within the hour and the project has no
 * Storage bucket to copy it into.
 */
export interface StoredPhoto {
  id?: string;
  pinguUrl: string;
  createdAt?: any;
}

/**
 * Saves a finished Pingu to Firestore collection 'photos'.
 */
export async function savePhotoToFirestore(photo: Omit<StoredPhoto, 'id' | 'createdAt'>): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'photos'), {
      pinguUrl: photo.pinguUrl,
      status: 'done',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Failed to save photo to Firestore:', error);
    return null;
  }
}

/**
 * Subscribes to real-time updates of photos taken by everyone.
 */
export function subscribeToSavedPhotos(callback: (photos: StoredPhoto[]) => void) {
  try {
    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      // Entries from before the booth stopped sharing webcam captures may have
      // no Pingu, only the raw photo. Those are left out of the strip.
      const photos: StoredPhoto[] = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<StoredPhoto, 'id'>) }))
        .filter((p) => typeof p.pinguUrl === 'string' && p.pinguUrl.length > 0);
      callback(photos);
    }, (error) => {
      console.warn('Firestore subscription notice (make sure Firestore rules allow read):', error);
    });
  } catch (error) {
    console.warn('Failed to setup Firestore listener:', error);
    return () => {};
  }
}
