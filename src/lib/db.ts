import { toast } from 'sonner';

// Simplified Mock Firestore API using localStorage
const STORAGE_KEY = 'snapsearch_mock_db';

interface MockDB {
  [collectionName: string]: {
    [docId: string]: any;
  };
}

function loadDB(): MockDB {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

function saveDB(db: MockDB) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  // Notify listeners (simple implementation)
  window.dispatchEvent(new CustomEvent('db_change'));
}

export const db = {
  // Reference for firestoreDatabaseId (ignored in mock)
  firestoreDatabaseId: 'mock-id'
};

export const serverTimestamp = () => new Date().toISOString();

export const increment = (n: number) => ({ __type: 'increment', value: n });

// Helper to join path segments
function getPath(...args: any[]): string {
  // Filter out the db instance if it's the first argument
  const segments = args[0] === db ? args.slice(1) : args;
  return segments.join('/');
}

export function doc(...args: any[]) {
  const path = getPath(...args);
  const segments = path.split('/');
  return { 
    path, 
    collectionName: segments.slice(0, -1).join('/'), 
    docId: segments[segments.length - 1] 
  };
}

export function collection(...args: any[]) {
  const path = getPath(...args);
  return { path, collectionName: path };
}

export function collectionGroup(dbInstance: any, collectionName: string) {
  return { collectionName, isGroup: true };
}

export function query(ref: any, ...constraints: any[]) {
  return { ...ref, constraints };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(n: number) {
  return { type: 'limit', value: n };
}

export async function getDocs(q: any) {
  const data = loadDB();
  let results: any[] = [];

  if (q.isGroup) {
    // Search across all collections with this name
    Object.keys(data).forEach(col => {
      if (col.endsWith(q.collectionName) || col === q.collectionName) {
        Object.entries(data[col]).forEach(([id, docData]) => {
          results.push({ id, ...docData });
        });
      }
    });
  } else {
    // Check for nested collections in a flat structure
    // Since our mock is flat, we use the full path as the collection name
    const colData = data[q.collectionName] || {};
    results = Object.entries(colData).map(([id, docData]) => ({ id, ...docData }));
  }

  // Apply constraints
  q.constraints?.forEach((c: any) => {
    if (c.type === 'where') {
      results = results.filter(r => {
        if (c.op === '==') return r[c.field] === c.value;
        if (c.op === 'array-contains') return Array.isArray(r[c.field]) && r[c.field].includes(c.value);
        return true;
      });
    }
    if (c.type === 'orderBy') {
      results.sort((a, b) => {
        const valA = a[c.field];
        const valB = b[c.field];
        if (valA < valB) return c.direction === 'asc' ? -1 : 1;
        if (valA > valB) return c.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
  });

  return {
    docs: results.map(r => ({
      id: r.id,
      data: () => r,
      exists: () => true
    }))
  };
}

export async function getDoc(docRef: any) {
  const data = loadDB();
  const docData = data[docRef.collectionName]?.[docRef.docId];
  return {
    id: docRef.docId,
    exists: () => !!docData,
    data: () => docData
  };
}

export function onSnapshot(q: any, callback: (snapshot: any) => void) {
  const handler = async () => {
    const snapshot = await getDocs(q);
    callback(snapshot);
  };

  window.addEventListener('db_change', handler);
  handler(); // Initial call

  return () => window.removeEventListener('db_change', handler);
}

export async function addDoc(colRef: any, docData: any) {
  const data = loadDB();
  if (!data[colRef.collectionName]) data[colRef.collectionName] = {};
  const id = Math.random().toString(36).substring(7);
  
  const finalData = { ...docData };
  Object.keys(finalData).forEach(key => {
    if (finalData[key] === serverTimestamp()) finalData[key] = new Date().toISOString();
  });

  data[colRef.collectionName][id] = finalData;
  saveDB(data);
  return { id };
}

export async function setDoc(docRef: any, docData: any, options?: { merge: boolean }) {
  const data = loadDB();
  if (!data[docRef.collectionName]) data[docRef.collectionName] = {};
  
  const existing = data[docRef.collectionName][docRef.docId] || {};
  const finalData = options?.merge ? { ...existing, ...docData } : docData;

  Object.keys(finalData).forEach(key => {
    if (finalData[key]?.__type === 'increment') {
      finalData[key] = (existing[key] || 0) + finalData[key].value;
    }
  });

  data[docRef.collectionName][docRef.docId] = finalData;
  saveDB(data);
}

export async function updateDoc(docRef: any, docData: any) {
  return setDoc(docRef, docData, { merge: true });
}

export async function deleteDoc(docRef: any) {
  const data = loadDB();
  if (data[docRef.collectionName]) {
    delete data[docRef.collectionName][docRef.docId];
    saveDB(data);
  }
}

export async function getCountFromServer(q: any) {
  const snapshot = await getDocs(q);
  return {
    data: () => ({ count: snapshot.docs.length })
  };
}

export function writeBatch(dbInstance?: any) {
  const operations: Array<() => Promise<void>> = [];
  return {
    set: (docRef: any, data: any) => operations.push(() => setDoc(docRef, data)),
    update: (docRef: any, data: any) => operations.push(() => updateDoc(docRef, data)),
    delete: (docRef: any) => operations.push(() => deleteDoc(docRef)),
    commit: async () => {
      for (const op of operations) await op();
    }
  };
}
