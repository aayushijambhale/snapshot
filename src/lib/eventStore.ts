import { useState, useEffect } from 'react';
import { firestoreService } from './firestoreService';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook to manage and sync event state
 */
export function useEventStore(userId?: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    
    // If userId provided, only sync their events (optional)
    // Note: In Firestore, you'd need a separate query for this usually
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventList);
      setLoading(false);
    }, (err) => {
      console.error('Event Store Sync Error:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { events, loading, error };
}
