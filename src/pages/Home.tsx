import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, ArrowRight, QrCode, Trash2, Sparkles, Shield, Zap, Users, Camera as CameraIcon, Globe, Upload, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { generateEventDescription } from '../lib/gemini';
import { useDropzone } from 'react-dropzone';

export function Home() {
  const { user, login, isServerAuthenticated } = useAuth();
  const { isConnected, connect, createFolder, uploadJson, uploadFile } = useGoogleDrive();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventLocation, setEventLocation] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    step: 'ai' | 'folder' | 'files' | 'db' | 'done';
    message: string;
    progress?: number;
  } | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  } as any);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingEvents(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to create an event');
      login();
      return;
    }
    if (!eventName.trim()) return;

    setIsUploading(true);
    try {
      let driveFolderId = null;
      let driveFolderLink = null;

      // 1. AI Enhancement
      setUploadStatus({ step: 'ai', message: 'AI is crafting your event description...' });
      const aiDescription = await generateEventDescription(eventName, eventDate, eventLocation);

      // 2. Google Drive Folder
      if (isConnected) {
        setUploadStatus({ step: 'folder', message: 'Creating secure Google Drive folder...' });
        try {
          const folder = await createFolder(eventName);
          driveFolderId = folder.id;
          driveFolderLink = folder.webViewLink;

          // 3. Upload Files
          if (selectedFiles.length > 0) {
            setUploadStatus({ 
              step: 'files', 
              message: `Uploading ${selectedFiles.length} files to Drive...`,
              progress: 0 
            });

            for (let i = 0; i < selectedFiles.length; i++) {
              const file = selectedFiles[i];
              const base64 = await fileToBase64(file);
              await uploadFile(file.name, base64, file.type, driveFolderId);
              setUploadStatus(prev => prev ? { 
                ...prev, 
                progress: Math.round(((i + 1) / selectedFiles.length) * 100) 
              } : null);
            }
          }

          // Initial metadata
          await uploadJson('event_metadata', {
            name: eventName,
            date: eventDate,
            location: eventLocation,
            description: aiDescription,
            createdBy: user.uid,
            creatorName: user.displayName,
            createdAt: new Date().toISOString(),
            fileCount: selectedFiles.length
          }, driveFolderId);
        } catch (err) {
          console.error('Drive Sync Error:', err);
          toast.error('Failed to sync with Google Drive, but event will be created locally.');
        }
      }

      // 4. Firestore
      setUploadStatus({ step: 'db', message: 'Finalizing event details...' });
      const docRef = await addDoc(collection(db, 'events'), {
        name: eventName,
        date: eventDate,
        location: eventLocation,
        description: aiDescription,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        creatorName: user.displayName,
        driveFolderId,
        driveFolderLink,
        fileCount: selectedFiles.length
      });

      // Record activity
      await addDoc(collection(db, 'activity'), {
        userId: user.uid,
        type: 'create_event',
        description: `Created event "${eventName}" with ${selectedFiles.length} files`,
        timestamp: serverTimestamp(),
        eventId: docRef.id
      });

      setUploadStatus({ step: 'done', message: 'Event launched successfully!' });
      toast.success('Event created successfully!');
      
      setTimeout(() => {
        setEventName('');
        setSelectedFiles([]);
        setIsCreating(false);
        setIsUploading(false);
        setUploadStatus(null);
        navigate(`/event/${docRef.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
      setIsUploading(false);
      setUploadStatus(null);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{id: string, createdBy: string} | null>(null);

  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string, createdBy: string) => {
    e.stopPropagation();
    if (user?.uid !== createdBy) {
      toast.error('Only the creator can delete this event');
      return;
    }
    setEventToDelete({ id: eventId, createdBy });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteDoc(doc(db, 'events', eventToDelete.id));
      toast.success('Event deleted');
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete event');
    }
  };

  return (
    <div className="space-y-24 pb-32">
      {/* Hero Section - Editorial Style */}
      <section className="relative min-h-[80vh] flex flex-col justify-center overflow-hidden pt-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[600px] bg-gradient-to-b from-orange-500/10 via-rose-500/5 to-transparent blur-[120px] -z-10" />
        
        <div className="container mx-auto px-4 sm:px-6">
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="h-[1px] w-8 bg-orange-500" />
              <span className="micro-label text-orange-500">The Future of Event Photography</span>
            </motion.div>
            
            <div className="relative">
              <motion.h1 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="editorial-title dark:text-white"
              >
                Capture <br />
                <span className="gradient-text">Everything.</span>
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: -6 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="absolute -top-8 right-0 hidden lg:flex flex-col items-center gap-2 p-4 bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-700"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest dark:text-white">AI Powered</span>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-5 space-y-6"
              >
                <p className="text-xl text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                  SnapSearch uses cutting-edge AI to instantly organize your event photos and help guests find themselves in seconds.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {!isCreating ? (
                    <>
                      <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary text-lg px-10 py-5"
                      >
                        <Plus className="w-6 h-6" />
                        Create Event
                      </button>
                      {user && !isServerAuthenticated && (
                        <button
                          onClick={login}
                          className="btn-secondary text-lg px-10 py-5 border-orange-500 text-orange-500"
                        >
                          <Zap className="w-6 h-6" />
                          Reconnect Google
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => setIsCreating(false)}
                      className="btn-secondary text-lg px-10 py-5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-7"
              >
                <AnimatePresence mode="wait">
                  {isCreating && (
                    <motion.form 
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      onSubmit={handleCreateEvent} 
                      className="glass p-8 rounded-[2.5rem] shadow-2xl border border-white/20 space-y-6 relative overflow-hidden"
                    >
                      {isUploading && uploadStatus && (
                        <div className="absolute inset-0 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-6">
                          <div className="relative">
                            <div className="w-20 h-20 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              {uploadStatus.step === 'done' ? (
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                              ) : (
                                <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-black tracking-tight dark:text-white">
                              {uploadStatus.step === 'done' ? 'Success!' : 'Processing...'}
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                              {uploadStatus.message}
                            </p>
                          </div>
                          {uploadStatus.progress !== undefined && (
                            <div className="w-full max-w-xs h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-orange-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadStatus.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-4">
                        {!isConnected && (
                          <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-orange-500 rounded-lg">
                                <Globe className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest dark:text-white">Google Drive</p>
                                <p className="text-[9px] text-neutral-500 dark:text-neutral-400 font-medium">Connect to auto-backup photos</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={connect}
                              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                            >
                              Connect
                            </button>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <label className="micro-label ml-3">Event Name</label>
                          <input
                            autoFocus
                            type="text"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="e.g. Summer Gala 2024"
                            className="input-premium text-lg font-bold"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="micro-label ml-3">Date</label>
                            <input
                              type="date"
                              value={eventDate}
                              onChange={(e) => setEventDate(e.target.value)}
                              className="input-premium font-bold"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="micro-label ml-3">Location</label>
                            <input
                              type="text"
                              value={eventLocation}
                              onChange={(e) => setEventLocation(e.target.value)}
                              placeholder="e.g. San Francisco"
                              className="input-premium font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="micro-label ml-3">Event Files (Optional)</label>
                          <div 
                            {...getRootProps()} 
                            className={`border-2 border-dashed rounded-3xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                              isDragActive 
                                ? 'border-orange-500 bg-orange-500/5' 
                                : 'border-neutral-200 dark:border-neutral-800 hover:border-orange-500/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                            }`}
                          >
                            <input {...getInputProps()} />
                            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
                              <Upload className="w-6 h-6 text-neutral-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold dark:text-white">Drop files here or click to browse</p>
                              <p className="text-[10px] text-neutral-400 font-medium mt-1">Images, PDFs, or Docs (Max 10MB)</p>
                            </div>
                          </div>

                          {selectedFiles.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 mt-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                              {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
                                      <CameraIcon className="w-3.5 h-3.5 text-neutral-400" />
                                    </div>
                                    <span className="text-xs font-bold truncate dark:text-white">{file.name}</span>
                                    <span className="text-[10px] text-neutral-400 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="p-1.5 hover:bg-rose-500/10 hover:text-rose-500 text-neutral-400 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="btn-primary w-full py-5 text-lg uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Launching...
                          </div>
                        ) : (
                          'Launch Event Gallery'
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="container mx-auto px-4 sm:px-6 space-y-12">
        <div className="space-y-3 text-center">
          <span className="micro-label text-orange-500">Why SnapSearch?</span>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter dark:text-white">Built for the <br /> <span className="gradient-text">Modern Event.</span></h2>
        </div>

        <div className="bento-grid">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item md:col-span-8 min-h-[350px] bg-neutral-900 text-white border-none"
          >
            <div className="space-y-5 relative z-10">
              <div className="p-3 bg-orange-500 w-fit rounded-xl shadow-lg shadow-orange-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tighter">AI Face Recognition</h3>
                <p className="text-lg text-neutral-400 font-medium max-w-md">Guests just take a selfie and our AI finds every photo they're in. No more scrolling through thousands of images.</p>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px]" />
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item md:col-span-4 bg-white dark:bg-neutral-900"
          >
            <div className="space-y-5">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter dark:text-white">Instant Sharing</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">Generate a QR code and let guests upload and view photos in real-time.</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item md:col-span-4 bg-white dark:bg-neutral-900"
          >
            <div className="space-y-5">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter dark:text-white">Privacy First</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">Advanced face blurring and privacy controls for sensitive events.</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item md:col-span-8 bg-gradient-to-br from-purple-600 to-rose-600 text-white border-none"
          >
            <div className="space-y-5 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md w-fit rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tighter">Community Driven</h3>
                <p className="text-lg text-white/80 font-medium max-w-md">Likes, comments, and engagement metrics for every moment captured.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 p-10 rounded-[3rem] max-w-sm w-full text-center space-y-8 shadow-2xl border border-neutral-100 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-red-50 dark:bg-red-900/20 w-fit mx-auto rounded-full">
                <Trash2 className="w-12 h-12 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black dark:text-white tracking-tighter">Delete Event?</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">This will permanently remove the gallery and all its photos. This action cannot be undone.</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-3xl font-black hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-5 bg-red-500 text-white rounded-3xl font-black hover:bg-red-600 transition-all shadow-xl shadow-red-200 dark:shadow-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
