import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, deleteDoc, writeBatch, increment, setDoc, addDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, Search, Share2, Upload, Grid, ArrowLeft, Download, Trash2, Tag, User, Filter, X as CloseIcon, Settings, CheckSquare, Square, AlertTriangle, Calendar as CalendarIcon, MapPin, Heart, MessageCircle, Send, Sparkles, Smile, ShieldOff, RefreshCw, ArrowRight, QrCode, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateCaptionAndHashtags, detectFaces } from '../lib/gemini';

export function EventGallery() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, checkServerSession } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSingleDeleteConfirm, setShowSingleDeleteConfirm] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<{id: string, uploadedBy: string} | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState('AI is thinking...');
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleLike = async (photoId: string, currentLikes: string[] = []) => {
    if (!user || !eventId) {
      toast.error('Please login to like photos');
      return;
    }

    const isLiked = currentLikes.includes(user.uid);
    const newLikes = isLiked 
      ? currentLikes.filter(id => id !== user.uid)
      : [...currentLikes, user.uid];

    try {
      await updateDoc(doc(db, 'events', eventId, 'photos', photoId), {
        likes: newLikes
      });

      if (!isLiked) {
        const photo = photos.find(p => p.id === photoId);
        if (photo && photo.uploadedBy !== user.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: photo.uploadedBy,
            title: 'New Like!',
            message: `${user.displayName || 'Someone'} liked your photo in "${event?.name}"`,
            type: 'like',
            read: false,
            timestamp: serverTimestamp(),
            link: `/event/${eventId}`
          });
        }
      }
    } catch (error) {
      console.error('Error liking photo:', error);
    }
  };

  const handleAddComment = async (photoId: string) => {
    if (!user || !eventId || !commentText.trim()) return;

    const newComment = {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userPhoto: user.photoURL || '',
      text: commentText.trim(),
      timestamp: Date.now()
    };

    try {
      const photo = photos.find(p => p.id === photoId);
      const currentComments = photo.comments || [];
      
      await updateDoc(doc(db, 'events', eventId, 'photos', photoId), {
        comments: [...currentComments, newComment]
      });

      setCommentText('');

      if (photo.uploadedBy !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: photo.uploadedBy,
          title: 'New Comment!',
          message: `${user.displayName || 'Someone'} commented on your photo: "${commentText.slice(0, 30)}..."`,
          type: 'comment',
          read: false,
          timestamp: serverTimestamp(),
          link: `/event/${eventId}`
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  useEffect(() => {
    if (!eventId) return;

    if (!eventId) {
      navigate('/');
      return;
    }

    const fetchEvent = async () => {
      try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() });
        } else {
          toast.error('Event not found');
          navigate('/');
        }
      } catch (error) {
        console.error('Fetch event error:', error);
        toast.error('Failed to load event');
        navigate('/');
      }
    };

    fetchEvent();

    const q = query(collection(db, 'events', eventId, 'photos'), orderBy('uploadedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId, navigate]);

  // Extract unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    photos.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((t: string) => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [photos]);

  // Filter photos
  const filteredPhotos = useMemo(() => {
    if (selectedTags.length === 0) return photos;
    return photos.filter(p => 
      p.tags && Array.isArray(p.tags) && selectedTags.every(t => p.tags.includes(t))
    );
  }, [photos, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev => 
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedPhotoIds.length === 0) return;
    setDeletingBulk(true);
    const batch = writeBatch(db);
    
    try {
      selectedPhotoIds.forEach(id => {
        batch.delete(doc(db, 'events', eventId!, 'photos', id));
      });
      await batch.commit();
      toast.success(`Deleted ${selectedPhotoIds.length} photos`);
      setSelectedPhotoIds([]);
      setIsSelectMode(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete photos');
    } finally {
      setDeletingBulk(false);
    }
  };

  const shareUrl = `${window.location.origin}/event/${eventId}`;

  const handleDownload = async (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Increment download count on the photo and user stats
    try {
      if (eventId) {
        await updateDoc(doc(db, 'events', eventId, 'photos', id), {
          downloadCount: increment(1)
        });
      }

      if (user) {
        await setDoc(doc(db, 'user_stats', user.uid), {
          totalDownloads: increment(1)
        }, { merge: true });

        // Record activity
        await addDoc(collection(db, 'activity'), {
          userId: user.uid,
          type: 'download',
          description: `Downloaded a photo from "${event?.name || 'event'}"`,
          timestamp: serverTimestamp(),
          eventId: eventId,
          photoId: id
        });
      }
    } catch (error) {
      console.error('Error updating download stats:', error);
    }
  };

  const handleBulkDownload = async () => {
    if (filteredPhotos.length === 0) return;
    setDownloadingAll(true);
    const zip = new JSZip();
    const folder = zip.folder(`${event?.name || 'event'}-photos`);

    try {
      for (let i = 0; i < filteredPhotos.length; i++) {
        const photo = filteredPhotos[i];
        const base64Data = photo.url.split(',')[1];
        folder?.file(`photo-${photo.id}.jpg`, base64Data, { base64: true });
        setZipProgress(Math.round(((i + 1) / filteredPhotos.length) * 50)); // First 50% is adding files
      }

      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setZipProgress(50 + Math.round(metadata.percent / 2)); // Last 50% is generating zip
      });
      saveAs(content, `${event?.name || 'event'}-photos.zip`);
      toast.success('Bulk download started!');
      setZipProgress(0);
      
      // Increment download stat
      if (user) {
        try {
          await setDoc(doc(db, 'user_stats', user.uid), {
            totalDownloads: increment(filteredPhotos.length)
          }, { merge: true });

          // Record activity
          await addDoc(collection(db, 'activity'), {
            userId: user.uid,
            type: 'download',
            description: `Bulk downloaded ${filteredPhotos.length} photos from "${event?.name || 'event'}"`,
            timestamp: serverTimestamp(),
            eventId: eventId
          });
        } catch (error) {
          console.error('Error updating download stats:', error);
        }
      }
    } catch (error) {
      console.error('Bulk download error:', error);
      toast.error('Failed to create zip file');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDelete = async (photoId: string, uploadedBy: string) => {
    const isCreator = user?.uid === event?.createdBy;
    const isPhotographer = user?.uid === uploadedBy;

    if (!isCreator && !isPhotographer) {
      toast.error('You do not have permission to delete this photo');
      return;
    }

    setPhotoToDelete({ id: photoId, uploadedBy });
    setShowSingleDeleteConfirm(true);
  };

  const confirmSingleDelete = async () => {
    if (!photoToDelete || !eventId) return;
    try {
      await deleteDoc(doc(db, 'events', eventId, 'photos', photoToDelete.id));
      toast.success('Photo deleted');
      if (selectedPhoto?.id === photoToDelete.id) setSelectedPhoto(null);
      setShowSingleDeleteConfirm(false);
      setPhotoToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleGenerateCaption = async () => {
    if (!selectedPhoto || !eventId) return;
    setAiLoadingMessage('Analyzing image and generating caption...');
    setAiLoading(true);
    try {
      const result = await generateCaptionAndHashtags(selectedPhoto.url);
      const photoRef = doc(db, 'events', eventId, 'photos', selectedPhoto.id);
      await updateDoc(photoRef, {
        caption: result.caption,
        tags: arrayUnion(...result.hashtags.map((h: string) => h.replace('#', '')))
      });
      setSelectedPhoto({ 
        ...selectedPhoto, 
        caption: result.caption, 
        tags: [...(selectedPhoto.tags || []), ...result.hashtags.map((h: string) => h.replace('#', ''))] 
      });
      toast.success('AI Caption generated!');
    } catch (error: any) {
      console.error("AI Caption error:", error);
      if (error.message === 'Not authenticated') {
        checkServerSession();
        toast.error('Session expired. Please login again to use AI features.');
      } else {
        toast.error('Failed to generate caption');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleBlurFaces = async () => {
    if (!selectedPhoto || !canvasRef.current) return;
    setAiLoadingMessage('Identifying faces to apply privacy blur...');
    setAiLoading(true);
    try {
      const faces = await detectFaces(selectedPhoto.url);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedPhoto.url;
      
      await new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          faces.forEach((face: any) => {
            const { ymin, xmin, ymax, xmax } = face.boundingBox;
            const x = (xmin / 1000) * img.width;
            const y = (ymin / 1000) * img.height;
            const w = ((xmax - xmin) / 1000) * img.width;
            const h = ((ymax - ymin) / 1000) * img.height;

            // Apply blur to the face region
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.filter = 'blur(30px)';
            ctx.drawImage(canvas, 0, 0);
            ctx.restore();
          });

          const blurredUrl = canvas.toDataURL('image/jpeg');
          setSelectedPhoto({ ...selectedPhoto, url: blurredUrl });
          resolve(null);
        };
      });
      toast.success('Faces blurred successfully!');
    } catch (error: any) {
      console.error("AI Blur error:", error);
      if (error.message === 'Not authenticated') {
        checkServerSession();
        toast.error('Session expired. Please login again to use AI features.');
      } else {
        toast.error('Failed to blur faces');
      }
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32">
      {/* Header Section - Editorial Style */}
      <section className="relative py-12 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[500px] bg-gradient-to-b from-orange-500/10 via-rose-500/5 to-transparent blur-[120px] -z-10" />
        
        <div className="container mx-auto px-4 sm:px-6">
          <div className="space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="space-y-8 max-w-4xl">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  <Link 
                    to="/" 
                    className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4 text-neutral-400 group-hover:text-orange-500" />
                  </Link>
                  <div className="h-[1px] w-8 bg-orange-500/30" />
                  <span className="micro-label text-orange-500">Live Event Gallery</span>
                </motion.div>

                <div className="space-y-4">
                  <motion.h1 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-6xl sm:text-8xl font-black tracking-tighter leading-[0.85] dark:text-white"
                  >
                    {event?.name || 'Loading...'}
                  </motion.h1>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-3 pt-2"
                  >
                    <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {event?.date || 'TBA'}
                    </div>
                    {event?.location && (
                      <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </div>
                    )}
                    <div className="px-4 py-2 bg-orange-500/10 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-orange-500 flex items-center gap-2">
                      <Grid className="w-3.5 h-3.5" />
                      {photos.length} Photos
                    </div>
                    {event?.fileCount > 0 && (
                      <div className="px-4 py-2 bg-blue-500/10 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-blue-500 flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        {event.fileCount} Files
                      </div>
                    )}
                  </motion.div>

                  {event?.description && (
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed font-medium"
                    >
                      {event.description}
                    </motion.p>
                  )}
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center gap-3"
              >
                <div className="flex gap-2">
                  {user?.uid === event?.createdBy && (
                    <Link
                      to={`/event/${eventId}/settings`}
                      className="p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group shadow-sm"
                      title="Settings"
                    >
                      <Settings className="w-5 h-5 text-neutral-400 group-hover:text-orange-500" />
                    </Link>
                  )}
                  <button
                    onClick={() => setShowQR(true)}
                    className="p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group shadow-sm flex items-center gap-2"
                    title="Event QR"
                  >
                    <QrCode className="w-5 h-5 text-neutral-400 group-hover:text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-orange-500 hidden md:block">Share QR</span>
                  </button>
                  {event?.driveFolderLink && (
                    <a
                      href={event.driveFolderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group shadow-sm flex items-center gap-2"
                      title="View on Google Drive"
                    >
                      <Globe className="w-5 h-5 text-neutral-400 group-hover:text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-blue-500 hidden md:block">Drive Folder</span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      setSelectedPhotoIds([]);
                    }}
                    className={`p-4 rounded-2xl transition-all shadow-sm flex items-center gap-2 ${
                      isSelectMode 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-400 hover:text-orange-500'
                    }`}
                  >
                    {isSelectMode ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    {isSelectMode && <span className="text-[10px] font-black uppercase tracking-widest">Done</span>}
                  </button>
                </div>

                <div className="h-10 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

                <div className="flex gap-3 w-full sm:w-auto">
                  <Link
                    to={`/event/${eventId}/search`}
                    className="flex-1 sm:flex-none btn-secondary border-none bg-black dark:bg-white text-white dark:text-black shadow-2xl group"
                  >
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Find Me
                  </Link>
                  
                  <Link
                    to={`/event/${eventId}/upload`}
                    className="flex-1 sm:flex-none btn-primary"
                  >
                    <Upload className="w-5 h-5" />
                    Upload
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {isSelectMode && selectedPhotoIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] glass-dark px-6 py-3 rounded-2xl flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm">
                {selectedPhotoIds.length}
              </div>
              <p className="text-white font-bold text-xs">Photos Selected</p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  onClick={handleBulkDownload}
                  disabled={downloadingAll}
                  className="p-2.5 bg-white/10 text-white rounded-lg hover:bg-white hover:text-black transition-all disabled:opacity-50"
                >
                  {downloadingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
                {downloadingAll && zipProgress > 0 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    {zipProgress}%
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag Filtering */}
      {allTags.length > 0 && (
        <div className="space-y-3 px-2">
          <div className="flex items-center gap-2 text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
            <Filter className="w-3.5 h-3.5 text-orange-500" /> Filter Gallery
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  selectedTags.includes(tag)
                    ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-200 dark:shadow-none'
                    : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-orange-500/30'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                  className={`group relative aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-[2.5rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer ring-offset-4 dark:ring-offset-neutral-950 ${
                    selectedPhotoIds.includes(photo.id) ? 'ring-4 ring-orange-500 scale-95' : ''
                  }`}
                  onClick={() => isSelectMode ? togglePhotoSelection(photo.id) : setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || "Event photo"}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  
                  {isSelectMode && (
                    <div className="absolute top-4 right-4 z-10">
                      {selectedPhotoIds.includes(photo.id) ? (
                        <div className="bg-orange-500 text-white p-2 rounded-2xl shadow-xl">
                          <CheckSquare className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="bg-white/40 backdrop-blur-xl text-white p-2 rounded-2xl border border-white/20">
                          <Square className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-white text-[10px] font-black uppercase tracking-widest opacity-60">
                          By {photo.photographerName?.split(' ')[0] || 'Photog'}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(photo.id, photo.likes || []);
                            }}
                            className="flex items-center gap-1 text-white hover:scale-110 transition-transform"
                          >
                            <Heart className={`w-3 h-3 ${photo.likes?.includes(user?.uid) ? 'fill-orange-500 text-orange-500' : 'text-white'}`} />
                            <span className="text-[10px] font-black">{(photo.likes || []).length}</span>
                          </button>
                          <div className="flex items-center gap-1 text-white">
                            <MessageCircle className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] font-black">{(photo.comments || []).length}</span>
                          </div>
                          <div className="flex items-center gap-1 text-white">
                            <Download className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] font-black">{photo.downloadCount || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-2xl text-black hover:scale-110 transition-transform shadow-xl">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
            ))}
          </AnimatePresence>
        )}
        {!loading && filteredPhotos.length === 0 && photos.length > 0 && (
          <div className="col-span-full py-24 text-center space-y-4 bg-white dark:bg-neutral-900 rounded-[3rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800">
            <div className="p-6 bg-neutral-50 dark:bg-neutral-800 w-fit mx-auto rounded-full">
              <Filter className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold text-neutral-500 dark:text-neutral-400">No photos match your filters</p>
              <p className="text-neutral-400 dark:text-neutral-500">Try selecting different tags or clear all filters.</p>
            </div>
            <button
              onClick={() => setSelectedTags([])}
              className="px-8 py-3 bg-black dark:bg-white dark:text-black text-white rounded-full font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg active:scale-95"
            >
              Clear Filters
            </button>
          </div>
        )}
        {!loading && photos.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-4 bg-white dark:bg-neutral-900 rounded-[3rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800">
            <div className="p-6 bg-neutral-50 dark:bg-neutral-800 w-fit mx-auto rounded-full">
              <Grid className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold text-neutral-500 dark:text-neutral-400">No photos yet</p>
              <p className="text-neutral-400 dark:text-neutral-500">Be the first to upload photos to this event!</p>
            </div>
            <Link
              to={`/event/${eventId}/upload`}
              className="inline-block px-8 py-3 bg-black dark:bg-white dark:text-black text-white rounded-full font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg active:scale-95"
            >
              Upload Photos
            </Link>
          </div>
        )}
      </div>

      {/* Photo Detail Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-10"
            onClick={() => { setSelectedPhoto(null); setDetectedFaces([]); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              className="bg-white dark:bg-neutral-900 w-full h-full sm:h-auto sm:max-w-6xl sm:rounded-[4rem] overflow-hidden flex flex-col lg:flex-row shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image Section */}
              <div className="relative flex-1 bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center group overflow-hidden">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Detail"}
                  className="max-w-full max-h-[50vh] lg:max-h-[80vh] object-contain shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]"
                  referrerPolicy="no-referrer"
                />
                
                <canvas ref={canvasRef} className="hidden" />

                <button
                  onClick={() => { setSelectedPhoto(null); setDetectedFaces([]); }}
                  className="absolute top-8 left-8 p-4 bg-white/10 backdrop-blur-xl text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10 active:scale-90"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>

                {aiLoading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        <RefreshCw className="w-16 h-16 text-orange-500 animate-spin" />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white animate-pulse" />
                      </div>
                      <p className="text-white text-xl font-black tracking-tighter uppercase animate-pulse">{aiLoadingMessage}</p>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  <button
                    onClick={() => handleDownload(selectedPhoto.url, selectedPhoto.id)}
                    className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 transition-all shadow-2xl active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              </div>

              {/* Sidebar Section */}
              <div className="w-full lg:w-[450px] flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-100 dark:border-neutral-800">
                {/* Header */}
                <div className="p-10 border-b border-neutral-100 dark:border-neutral-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-200 dark:shadow-none">
                        {selectedPhoto.photographerName?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="text-sm font-black dark:text-white">{selectedPhoto.photographerName || 'Photographer'}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                          {selectedPhoto.createdAt?.toDate ? new Date(selectedPhoto.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Downloads</p>
                        <p className="text-sm font-black dark:text-white">{selectedPhoto.downloadCount || 0}</p>
                      </div>
                      <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLike(selectedPhoto.id, selectedPhoto.likes || [])}
                        className={`p-4 rounded-2xl transition-all active:scale-90 ${
                          (selectedPhoto.likes || []).includes(user?.uid)
                            ? 'bg-orange-500 text-white shadow-xl shadow-orange-200 dark:shadow-none'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-orange-500'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${(selectedPhoto.likes || []).includes(user?.uid) ? 'fill-current' : ''}`} />
                      </button>
                      {(user?.uid === selectedPhoto.uploadedBy || user?.uid === event?.createdBy) && (
                        <button
                          onClick={() => handleDelete(selectedPhoto.id, selectedPhoto.uploadedBy)}
                          className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {selectedPhoto.caption && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg font-medium dark:text-neutral-200 leading-relaxed italic"
                    >
                      "{selectedPhoto.caption}"
                    </motion.p>
                  )}

                  {/* AI Tools Section */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                      <Sparkles className="w-4 h-4 text-orange-500" /> AI Insights
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleGenerateCaption}
                        disabled={aiLoading}
                        className="flex flex-col items-center gap-2 p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all disabled:opacity-50 border border-orange-100 dark:border-orange-900/50"
                      >
                        <Camera className="w-5 h-5" />
                        Caption
                      </button>
                      <button
                        onClick={handleBlurFaces}
                        disabled={aiLoading}
                        className="flex flex-col items-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all disabled:opacity-50 border border-purple-100 dark:border-purple-900/50"
                      >
                        <ShieldOff className="w-5 h-5" />
                        Blur
                      </button>
                    </div>
                    
                    {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPhoto.tags.map((tag: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl text-[10px] font-bold border border-neutral-200 dark:border-neutral-700">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-neutral-50/50 dark:bg-neutral-950/50">
                  <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                    <MessageCircle className="w-4 h-4 text-blue-500" /> Community
                  </div>
                  
                  <div className="space-y-8">
                    {(selectedPhoto.comments || []).length === 0 ? (
                      <div className="text-center py-10 space-y-3">
                        <div className="p-6 bg-white dark:bg-neutral-900 w-fit mx-auto rounded-[2rem] shadow-sm">
                          <MessageCircle className="w-8 h-8 text-neutral-200" />
                        </div>
                        <p className="text-sm font-bold text-neutral-400">No comments yet. Be the first!</p>
                      </div>
                    ) : (
                      selectedPhoto.comments.map((comment: any, i: number) => (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={i}
                          className="flex gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-500 font-black text-sm shrink-0 shadow-sm border border-neutral-100 dark:border-neutral-800">
                            {comment.userName?.charAt(0) || 'U'}
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-black dark:text-white">{comment.userName}</p>
                              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                                {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">{comment.text}</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Comment Input */}
                <div className="p-8 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (commentText.trim()) {
                        handleAddComment(selectedPhoto.id);
                      }
                    }}
                    className="relative"
                  >
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      type="text"
                      placeholder="Share your thoughts..."
                      className="w-full pl-8 pr-20 py-6 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all dark:text-white font-bold text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 dark:shadow-none disabled:opacity-50 disabled:grayscale active:scale-95"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Photo Delete Confirmation Modal */}
      <AnimatePresence>
        {showSingleDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSingleDeleteConfirm(false)}
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
                <h3 className="text-3xl font-black dark:text-white tracking-tighter">Delete Photo?</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">This will permanently remove this photo from the gallery. This action cannot be undone.</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowSingleDeleteConfirm(false)}
                  className="flex-1 py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-3xl font-black hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSingleDelete}
                  className="flex-1 py-5 bg-red-500 text-white rounded-3xl font-black hover:bg-red-600 transition-all shadow-xl shadow-red-200 dark:shadow-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] max-w-sm w-full text-center space-y-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-red-50 dark:bg-red-900/20 w-fit mx-auto rounded-full">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold dark:text-white">Delete {selectedPhotoIds.length} photos?</h3>
                <p className="text-neutral-500 dark:text-neutral-400">This action cannot be undone. All selected photos will be permanently removed.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deletingBulk}
                  className="flex-1 py-4 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200 disabled:opacity-50"
                >
                  {deletingBulk ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 p-10 rounded-[3rem] max-w-sm w-full text-center space-y-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-extrabold tracking-tight dark:text-white">Event QR</h3>
                <p className="text-neutral-500 dark:text-neutral-400">Scan to join the gallery</p>
              </div>
              
              <div className="bg-neutral-50 dark:bg-white p-8 rounded-[2rem] inline-block border border-neutral-100 dark:border-neutral-800 shadow-inner">
                <QRCodeSVG value={shareUrl} size={200} />
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-[10px] font-mono break-all border border-neutral-100 dark:border-neutral-700 text-neutral-400">
                  {shareUrl}
                </div>
                <button
                  onClick={() => setShowQR(false)}
                  className="w-full py-4 bg-black dark:bg-white dark:text-black text-white rounded-full font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
