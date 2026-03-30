import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { collection, addDoc, serverTimestamp } from '../lib/db';
import { db } from '../lib/db';
import { uploadToDrive } from '../lib/drive';
import { useAuth } from './AuthContext';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';

interface QueuedPhoto {
  id: string;
  file: File;
  caption: string;
  tags: string[];
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
}

interface UploadTask {
  eventId: string;
  photos: QueuedPhoto[];
  totalPhotos: number;
  completedPhotos: number;
  overallProgress: number;
  isProcessing: boolean;
}

interface UploadContextType {
  currentTask: UploadTask | null;
  queueUploads: (eventId: string, photos: any[]) => void;
  clearTask: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTask, setCurrentTask] = useState<UploadTask | null>(null);

  const startProcessingTask = useCallback(async (eventId: string, initialPhotos: QueuedPhoto[]) => {
    if (!user) return;

    let successCount = 0;
    const total = initialPhotos.length;

    for (let i = 0; i < initialPhotos.length; i++) {
        const photo = initialPhotos[i];
        
        // 1. Update status to compressing
        setCurrentTask(prev => {
            if (!prev) return null;
            return {
                ...prev,
                photos: prev.photos.map(p => p.id === photo.id ? { ...p, status: 'compressing', progress: 20 } : p)
            };
        });

        // 2. Image Compression
        const options = {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        
        let compressedFile;
        try {
          compressedFile = await imageCompression(photo.file, options);
        } catch (e) {
          setCurrentTask(prev => {
            if (!prev) return null;
            return {
                ...prev,
                photos: prev.photos.map(p => p.id === photo.id ? { ...p, status: 'error' } : p)
            };
          });
          continue;
        }

        // 3. Update status to uploading
        setCurrentTask(prev => {
            if (!prev) return null;
            return {
                ...prev,
                photos: prev.photos.map(p => p.id === photo.id ? { ...p, status: 'uploading', progress: 60 } : p)
            };
        });
        
        // 4. Upload to Google Drive (if folder linked)
        let driveUrl = '';
        try {
          // Fetch event folder ID here or pass it in
          // For simplicity, we assume we have the folder ID passed later, or look up in queue
        } catch (driveErr: any) {
            console.error('Background upload failed:', driveErr);
            // ...handle error
        }

        // 5. This part is complex because we need the driveFolderId from the event.
        // We'll pass driveFolderId inside the initial setup.
    }
  }, [user]);

  // Actually, I'll rewrite the processing logic to be robust and handled via 'setCurrentTask' correctly.
  
  const queueUploads = useCallback(async (eventId: string, photos: any[], driveFolderId: string) => {
    if (!user) return;

    const initialPhotos: QueuedPhoto[] = photos.map(p => ({
        ...p,
        status: 'pending',
        progress: 0
    }));

    const newTask: UploadTask = {
        eventId,
        photos: initialPhotos,
        totalPhotos: photos.length,
        completedPhotos: 0,
        overallProgress: 0,
        isProcessing: true
    };

    setCurrentTask(newTask);

    // Run the actual background processing
    (async () => {
        let successTotal = 0;
        for(let i = 0; i < initialPhotos.length; i++) {
            const photo = initialPhotos[i];
            
            try {
                // Update specific photo status
                setCurrentTask(prev => prev ? {
                    ...prev,
                    photos: prev.photos.map(p => p.id === photo.id ? { ...p, status: 'compressing', progress: 10 } : p)
                } : null);

                // Compress
                const compressed = await imageCompression(photo.file, { maxSizeMB: 0.8, maxWidthOrHeight: 1920 });
                
                setCurrentTask(prev => prev ? {
                    ...prev,
                    photos: prev.photos.map(p => p.id === photo.id ? { ...p, status: 'uploading', progress: 40 } : p)
                } : null);

                // Drive Upload
                const driveUrl = await uploadToDrive(compressed, `${Date.now()}-${photo.file.name}`, driveFolderId);
                
                // Firestore
                await addDoc(collection(db, 'events', eventId, 'photos'), {
                    url: driveUrl,
                    caption: photo.caption.trim(),
                    tags: photo.tags,
                    uploadedAt: serverTimestamp(),
                    uploadedBy: user.uid,
                    photographerName: user.displayName,
                    eventId: eventId
                });

                successTotal++;
                setCurrentTask(prev => prev ? {
                    ...prev,
                    completedPhotos: successTotal,
                    overallProgress: Math.round(((i + 1) / initialPhotos.length) * 100),
                    photos: prev.photos.map(p => p.id === photo.id ? { ...p, status: 'done', progress: 100 } : p)
                } : null);

            } catch (e) {
                console.error('BG upload failed for', photo.id, e);
                setCurrentTask(prev => prev ? {
                    ...prev,
                    photos: prev.photos.map(p => p.id === photo.id ? { ...p, status: 'error' } : p)
                } : null);
            }
        }

        // Activity Record
        if (successTotal > 0) {
            await addDoc(collection(db, 'activity'), {
                userId: user.uid,
                type: 'upload',
                description: `Background uploaded ${successTotal} photos to event`,
                timestamp: serverTimestamp(),
                eventId: eventId
            });
            toast.success(`Upload complete: ${successTotal} photos added.`);
        }
        
        setCurrentTask(prev => prev ? { ...prev, isProcessing: false } : null);
    })();
  }, [user]);

  const clearTask = () => setCurrentTask(null);

  return (
    <UploadContext.Provider value={{ currentTask, queueUploads: queueUploads as any, clearTask }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploads() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUploads must be used within an UploadProvider');
  }
  return context;
}
