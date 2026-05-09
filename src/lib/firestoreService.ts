import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Service to handle Firestore database interactions
 */
export const firestoreService = {
  // Events
  async createEvent(data: any) {
    return await addDoc(collection(db, 'events'), {
      ...data,
      createdAt: serverTimestamp()
    });
  },

  async getEvent(id: string) {
    const docRef = doc(db, 'events', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async updateEvent(id: string, data: any) {
    const docRef = doc(db, 'events', id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteEvent(id: string) {
    return await deleteDoc(doc(db, 'events', id));
  },

  // Photos
  async addPhoto(eventId: string, data: any) {
    return await addDoc(collection(db, 'events', eventId, 'photos'), {
      ...data,
      uploadedAt: serverTimestamp()
    });
  },

  async getPhotos(eventId: string) {
    const q = query(collection(db, 'events', eventId, 'photos'), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // User Stats
  async updateUserStats(userId: string, data: any) {
    const docRef = doc(db, 'user_stats', userId);
    return await setDoc(docRef, data, { merge: true });
  },

  // Activity
  async recordActivity(data: any) {
    return await addDoc(collection(db, 'activity'), {
      ...data,
      timestamp: serverTimestamp()
    });
  }
};
