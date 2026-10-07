import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadString, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDb33PRJU4RIZJy_ff5RbZVDF0gqt-j6rk",
  authDomain: "sharedmindsjackie.firebaseapp.com",
  projectId: "sharedmindsjackie",
  storageBucket: "sharedmindsjackie.firebasestorage.app",
  messagingSenderId: "848330848329",
  appId: "1:848330848329:web:861a09b8a96a8031baa798"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export interface StoredPhoto {
  id?: string;
  photoUrl: string;
  pinguUrl?: string;
  status: 'developing' | 'done' | 'failed';
  createdAt?: any;
}

/**
 * Uploads a base64 data URL to Firebase Cloud Storage and returns the public download URL.
 * Falls back to returning the original dataUrl if Storage upload fails (e.g., storage rules).
 */
export async function uploadPhotoToStorage(dataUrl: string, filename: string): Promise<string> {
  try {
    const storageRef = ref(storage, `pingu_photos/${filename}`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.warn('Firebase Storage upload failed (falling back to data URL):', error);
    return dataUrl;
  }
}

/**
 * Uploads an external image URL to Firebase Storage for persistent archival.
 */
export async function uploadExternalImageToStorage(imageUrl: string, filename: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const storageRef = ref(storage, `pingu_photos/${filename}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.warn('Failed to upload external Pingu image to Storage (using direct URL):', error);
    return imageUrl;
  }
}

/**
 * Saves a new photo entry to Firestore collection 'photos'.
 */
export async function savePhotoToFirestore(photo: Omit<StoredPhoto, 'id' | 'createdAt'>): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'photos'), {
      ...photo,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Failed to save photo to Firestore:', error);
    return null;
  }
}

/**
 * Updates an existing photo entry in Firestore.
 */
export async function updatePhotoInFirestore(docId: string, changes: Partial<StoredPhoto>): Promise<void> {
  try {
    const docRef = doc(db, 'photos', docId);
    await updateDoc(docRef, changes);
  } catch (error) {
    console.error(`Failed to update photo ${docId} in Firestore:`, error);
  }
}

/**
 * Subscribes to real-time updates of photos taken by everyone.
 */
export function subscribeToSavedPhotos(callback: (photos: StoredPhoto[]) => void) {
  try {
    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const photos: StoredPhoto[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StoredPhoto, 'id'>),
      }));
      callback(photos);
    }, (error) => {
      console.warn('Firestore subscription notice (make sure Firestore rules allow read):', error);
    });
  } catch (error) {
    console.warn('Failed to setup Firestore listener:', error);
    return () => {};
  }
}
