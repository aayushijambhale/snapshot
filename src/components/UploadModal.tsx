import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { Upload, X, Image as ImageIcon, CheckCircle2, Tag, Type, Loader2, Settings, AlertCircle, RefreshCw, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { validateImage } from '../lib/fileValidator';

interface PhotoMetadata {
  id: string;
  file: File;
  preview: string;
  caption: string;
  tags: string;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

export function UploadModal({ isOpen, onClose, eventId, eventName }: UploadModalProps) {
  const { user, login } = useAuth();
  const { isConnected, uploadFile } = useGoogleDrive();
  const [photoData, setPhotoData] = useState<PhotoMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [compressionSettings, setCompressionSettings] = useState({
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1920,
    quality: 0.8
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: PhotoMetadata[] = [];
    
    acceptedFiles.forEach(file => {
      const validation = validateImage(file);
      if (!validation.isValid) {
        toast.error(validation.message);
        return;
      }

      validFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        tags: '',
        status: 'pending' as const,
        progress: 0
      });
    });

    setPhotoData(prev => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  } as any);

  const removePhoto = (id: string) => {
    setPhotoData(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const updateMetadata = (id: string, field: 'caption' | 'tags', value: string) => {
    setPhotoData(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error('Please login to upload photos');
      login();
      return;
    }
    if (photoData.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      const eventData = eventDoc.data();

      for (let i = 0; i < photoData.length; i++) {
        const photo = photoData[i];
        setPhotoData(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'compressing', progress: 20 } : p));

        const options = {
          maxSizeMB: compressionSettings.maxSizeMB,
          maxWidthOrHeight: compressionSettings.maxWidthOrHeight,
          initialQuality: compressionSettings.quality,
          useWebWorker: true,
          onProgress: (p: number) => {
            setPhotoData(prev => prev.map(item => item.id === photo.id ? { ...item, progress: 20 + (p * 0.3) } : item));
          }
        };
        
        let compressedFile;
        try {
          compressedFile = await imageCompression(photo.file, options);
        } catch (e) {
          setPhotoData(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'error' } : p));
          continue;
        }

        setPhotoData(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'uploading', progress: 60 } : p));
        
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });

        await addDoc(collection(db, 'events', eventId, 'photos'), {
          url: base64,
          caption: photo.caption.trim(),
          tags: photo.tags.split(',').map(t => t.trim()).filter(Boolean),
          uploadedAt: serverTimestamp(),
          uploadedBy: user.uid,
          photographerName: user.displayName,
          eventId: eventId,
          likes: [],
          comments: []
        });

        if (isConnected && eventData?.driveFolderId) {
          try {
            await uploadFile(
              `${photo.file.name.split('.')[0]}_${Date.now()}.jpg`,
              base64,
              'image/jpeg',
              eventData.driveFolderId
            );
          } catch (err) {
            console.error('Drive sync failed for', photo.file.name);
          }
        }
        
        setPhotoData(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'done', progress: 100 } : p));
        successCount++;
        setOverallProgress(Math.round(((i + 1) / photoData.length) * 100));
      }

      toast.success(`Successfully uploaded ${successCount} photos!`);
      
      // Record Activity
      try {
        await addDoc(collection(db, 'activity'), {
          userId: user.uid,
          type: 'upload',
          description: `Uploaded ${successCount} photos to "${eventName}"`,
          timestamp: serverTimestamp(),
          eventId: eventId
        });
      } catch (err) {
        console.error('Activity record failed:', err);
      }

      setTimeout(() => {
        onClose();
        setPhotoData([]);
        setOverallProgress(0);
        setUploading(false);
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload some photos');
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={!uploading ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter dark:text-white">Upload Moments</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">To {eventName}</p>
                </div>
              </div>
              {!uploading && (
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6 text-neutral-400" />
                </button>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-8">
                {photoData.length === 0 ? (
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-[2.5rem] p-16 text-center transition-all cursor-pointer
                      ${isDragActive ? 'border-orange-500 bg-orange-500/5' : 'border-neutral-200 dark:border-neutral-800 hover:border-orange-500/30'}
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className="space-y-6">
                      <div className="p-6 bg-orange-50 dark:bg-orange-900/20 w-fit mx-auto rounded-3xl">
                        <ImageIcon className="w-12 h-12 text-orange-500" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black dark:text-white tracking-tight">Drop your photos here</h4>
                        <p className="text-neutral-500 dark:text-neutral-400 font-medium">or click to browse your files</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {photoData.map(photo => (
                      <div key={photo.id} className="premium-card p-4 flex gap-4 items-center">
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={photo.preview} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Caption..."
                            value={photo.caption}
                            onChange={(e) => updateMetadata(photo.id, 'caption', e.target.value)}
                            className="input-premium text-xs py-2"
                            disabled={uploading}
                          />
                          <input
                            type="text"
                            placeholder="Tags (comma separated)..."
                            value={photo.tags}
                            onChange={(e) => updateMetadata(photo.id, 'tags', e.target.value)}
                            className="input-premium text-xs py-2"
                            disabled={uploading}
                          />
                        </div>
                        {!uploading && (
                          <button onClick={() => removePhoto(photo.id)} className="p-2 text-neutral-400 hover:text-red-500">
                            <X className="w-5 h-5" />
                          </button>
                        )}
                        {uploading && (
                          <div className="flex items-center gap-2">
                            {photo.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Loader2 className="w-5 h-5 animate-spin text-orange-500" />}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {photoData.length > 0 && (
              <div className="p-8 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {uploading ? (
                    <div className="w-full space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-orange-500">
                        <span>Uploading...</span>
                        <span>{overallProgress}%</span>
                      </div>
                      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-orange-500" animate={{ width: `${overallProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <button {...getRootProps()} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-orange-500 transition-colors">
                          <input {...getInputProps()} />
                          Add More
                        </button>
                        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
                        <button onClick={() => setPhotoData([])} className="text-[10px] font-black uppercase tracking-widest text-red-500">
                          Clear All
                        </button>
                      </div>
                      <button onClick={handleUpload} className="btn-primary px-10 py-4 text-base shadow-2xl active:scale-95">
                        <Upload className="w-5 h-5" />
                        Upload {photoData.length} Photos
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
