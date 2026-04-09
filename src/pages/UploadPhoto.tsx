import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { Upload, X, Image as ImageIcon, ArrowLeft, CheckCircle2, Tag, Type, Loader2, Settings, AlertCircle, Clock, RefreshCw, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

interface PhotoMetadata {
  id: string;
  file: File;
  preview: string;
  caption: string;
  tags: string;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
}

export function UploadPhoto() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { isConnected, uploadFile } = useGoogleDrive();
  const [photoData, setPhotoData] = useState<PhotoMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoMetadata | null>(null);
  const [compressionSettings, setCompressionSettings] = useState({
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1920,
    quality: 0.8
  });
  const [showSettings, setShowSettings] = useState(false);

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      photoData.forEach(p => URL.revokeObjectURL(p.preview));
    };
  }, [photoData]);

  React.useEffect(() => {
    if (!eventId) {
      navigate('/');
      return;
    }

    const fetchEvent = async () => {
      try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          toast.error('Event not found');
          navigate('/');
        }
      } catch (error) {
        console.error('Fetch event error:', error);
        toast.error('Failed to load event');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      tags: '',
      status: 'pending' as const,
      progress: 0
    }));
    setPhotoData(prev => [...prev, ...newPhotos]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  } as any);

  const removePhoto = (id: string) => {
    setPhotoData(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
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
      const eventDoc = await getDoc(doc(db, 'events', eventId!));
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

        await addDoc(collection(db, 'events', eventId!, 'photos'), {
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

        // Upload to Google Drive if connected and event has a folder
        if (isConnected && eventData?.driveFolderId) {
          const uploadWithRetry = async (retries = 3) => {
            for (let attempt = 1; attempt <= retries; attempt++) {
              try {
                await uploadFile(
                  `${photo.file.name.split('.')[0]}_${Date.now()}.jpg`,
                  base64,
                  'image/jpeg',
                  eventData.driveFolderId
                );
                return; // Success
              } catch (err) {
                console.error(`Drive upload attempt ${attempt} failed:`, err);
                if (attempt === retries) throw err;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
              }
            }
          };

          try {
            await uploadWithRetry();
          } catch (err) {
            console.error('Failed to upload to Drive after retries:', err);
            toast.error(`Drive sync failed for ${photo.file.name}`);
          }
        }
        
        setPhotoData(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'done', progress: 100 } : p));
        successCount++;
        setOverallProgress(Math.round(((i + 1) / photoData.length) * 100));
      }

      if (successCount > 0) {
        await addDoc(collection(db, 'activity'), {
          userId: user.uid,
          type: 'upload',
          description: `Uploaded ${successCount} photos to event`,
          timestamp: serverTimestamp(),
          eventId: eventId
        });

        if (eventData && eventData.createdBy !== user.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: eventData.createdBy,
            title: 'New Photos Uploaded!',
            message: `${user.displayName || 'Someone'} uploaded ${successCount} photos to your event "${eventData.name}"`,
            type: 'upload',
            read: false,
            timestamp: serverTimestamp(),
            link: `/event/${eventId}`
          });
        }
      }

      toast.success(`Successfully uploaded ${successCount} photos!`);
      setTimeout(() => navigate(`/event/${eventId}`), 1500);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload some photos');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-32 px-4 sm:px-6">
      <div className="space-y-3">
        <Link to={`/event/${eventId}`} className="btn-secondary px-4 py-2 text-[10px] uppercase tracking-widest w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Gallery
        </Link>
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter dark:text-white">Upload <span className="gradient-text">Moments.</span></h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 font-medium tracking-tight">Add your captures to the shared gallery.</p>
        </div>
      </div>

      <motion.div
        {...getRootProps()}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className={`
          relative border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer overflow-hidden
          ${isDragActive ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/50'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-orange-500/10 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border-2 border-orange-500">
                  <Upload className="w-12 h-12 text-orange-500 animate-bounce" />
                </div>
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter">Drop to Upload</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5 relative z-10">
          <div className="p-5 bg-orange-50 dark:bg-orange-900/20 w-fit mx-auto rounded-2xl shadow-lg shadow-orange-100 dark:shadow-none">
            <Upload className="w-8 h-8 text-orange-500" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xl font-black dark:text-white tracking-tight">
              {isDragActive ? 'Drop them now!' : 'Drag & drop photos'}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">or click to browse from your device</p>
          </div>
          <div className="flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest text-neutral-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> Auto-Compression</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> AI Ready</span>
          </div>
        </div>
        
        {/* Decorative background */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
      </motion.div>

      {/* Compression Settings */}
      <div className="premium-card p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-xl tracking-tight dark:text-white flex items-center gap-2.5">
              <div className="p-1.5 bg-orange-500 rounded-lg">
                <Settings className="w-4 h-4 text-white" />
              </div>
              Upload Settings
            </h3>
            <p className="text-xs text-neutral-400 font-medium">Configure how your photos are processed</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-neutral-500">
              Quality: <span className="text-orange-500">{Math.round(compressionSettings.quality * 100)}%</span>
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-1.5 rounded-lg transition-all border border-orange-500/20"
            >
              {showSettings ? 'Simple View' : 'Advanced Settings'}
            </button>
          </div>
        </div>

        {/* Quality Slider - Always Visible or Prominent */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-2">Image Quality (Compression)</label>
            <span className="text-[10px] font-black text-orange-500">{Math.round(compressionSettings.quality * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.05" 
            value={compressionSettings.quality}
            onChange={(e) => setCompressionSettings(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
            className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-[9px] font-bold text-neutral-400 px-1">
            <span>Smaller File (Fast)</span>
            <span>Best Quality (Slow)</span>
          </div>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-2">Max File Size (MB)</label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="5" 
                    step="0.1" 
                    value={compressionSettings.maxSizeMB}
                    onChange={(e) => setCompressionSettings(prev => ({ ...prev, maxSizeMB: parseFloat(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-neutral-500">
                    <span>0.1 MB</span>
                    <span className="text-orange-500 font-black">{compressionSettings.maxSizeMB} MB</span>
                    <span>5 MB</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-2">Max Dimension (px)</label>
                  <select 
                    value={compressionSettings.maxWidthOrHeight}
                    onChange={(e) => setCompressionSettings(prev => ({ ...prev, maxWidthOrHeight: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border-2 border-transparent focus:border-orange-500 outline-none text-sm font-bold dark:text-white transition-all"
                  >
                    <option value="1080">1080px (Standard)</option>
                    <option value="1920">1920px (Full HD)</option>
                    <option value="2560">2560px (2K)</option>
                    <option value="3840">3840px (4K)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {photoData.length > 0 && (
        <div className="space-y-8">
          <div className="flex items-center justify-between px-4">
            <h3 className="font-black text-2xl tracking-tighter flex items-center gap-3 dark:text-white">
              <div className="p-2 bg-orange-500 rounded-xl">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              Selected Photos ({photoData.length})
            </h3>
            {!uploading && (
              <button
                onClick={() => setPhotoData([])}
                className="text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl transition-all"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5">
            <AnimatePresence mode="popLayout">
              {photoData.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="premium-card p-5 flex flex-col sm:flex-row gap-6 group relative overflow-hidden"
                >
                  <div 
                    className="relative w-full sm:w-40 aspect-square rounded-2xl overflow-hidden flex-shrink-0 shadow-xl cursor-zoom-in"
                    onClick={() => setPreviewPhoto(photo)}
                  >
                    <img 
                      src={photo.preview} 
                      alt="Preview" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    {!uploading && (
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-black/50 backdrop-blur-md text-white rounded-lg hover:bg-red-500 transition-all active:scale-90"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {uploading && photo.status === 'done' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-green-500/60 backdrop-blur-[2px] flex items-center justify-center"
                      >
                        <CheckCircle2 className="w-10 h-10 text-white" />
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-5">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5 flex-1 mr-4">
                        <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 ml-2">
                          <Type className="w-3 h-3" /> Caption
                        </label>
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) => updateMetadata(photo.id, 'caption', e.target.value)}
                          placeholder="What's happening in this photo?"
                          disabled={uploading}
                          className="w-full px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-800 outline-none transition-all text-xs font-bold dark:text-white"
                        />
                      </div>
                      {uploading && (
                        <div className="text-right flex items-center gap-2">
                          {photo.status === 'compressing' && <Loader2 className="w-2.5 h-2.5 animate-spin text-orange-500" />}
                          {photo.status === 'uploading' && <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-500" />}
                          {photo.status === 'done' && <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />}
                          {photo.status === 'error' && <AlertCircle className="w-2.5 h-2.5 text-red-500" />}
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                            photo.status === 'done' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                            photo.status === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                            photo.status === 'uploading' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                            'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                          }`}>
                            {photo.status}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 ml-2">
                        <Tag className="w-3 h-3" /> Tags
                      </label>
                      <input
                        type="text"
                        value={photo.tags}
                        onChange={(e) => updateMetadata(photo.id, 'tags', e.target.value)}
                        placeholder="candid, sunset, group..."
                        disabled={uploading}
                        className="w-full px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-800 outline-none transition-all text-xs font-bold dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Individual Progress Bar */}
                  {uploading && photo.status !== 'done' && photo.status !== 'error' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-100 dark:bg-neutral-800">
                      <motion.div 
                        className={`h-full ${photo.status === 'compressing' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${photo.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="fixed bottom-12 left-0 right-0 px-4 z-50">
            <div className="max-w-3xl mx-auto">
              {uploading ? (
                <motion.div 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  className="glass-dark p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 space-y-3"
                >
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      <span className="text-white">Uploading {photoData.length} Moments</span>
                    </div>
                    <span className="text-orange-500">{overallProgress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  onClick={handleUpload}
                  className="btn-primary w-full py-5 text-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] group"
                >
                  <div className="p-1.5 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  Upload {photoData.length} Photos
                </motion.button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Full Screen Preview Modal */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-xl"
            onClick={() => setPreviewPhoto(null)}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50"
              onClick={() => setPreviewPhoto(null)}
            >
              <X className="w-8 h-8" />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden rounded-[3rem]">
                <img
                  src={previewPhoto.preview}
                  alt="Full preview"
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-white font-black text-xl tracking-tight">Review Moment</h4>
                    <p className="text-white/50 text-sm font-medium">{previewPhoto.file.name} • {(previewPhoto.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={() => {
                      removePhoto(previewPhoto.id);
                      setPreviewPhoto(null);
                    }}
                    className="px-6 py-3 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Remove Photo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
