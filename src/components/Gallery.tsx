import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Loader2, 
  Sparkles, 
  Download, 
  Share2, 
  Heart, 
  Maximize2, 
  X, 
  Search, 
  Filter,
  ArrowLeft,
  Camera,
  Globe,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function Gallery() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEvent({ id: docSnap.id, ...docSnap.data() });
      }
    };

    const q = query(
      collection(db, `events/${eventId}/photos`),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    fetchEvent();
    return () => unsubscribe();
  }, [eventId]);

  const handleLike = async (photo: any) => {
    if (!user) return;
    const photoRef = doc(db, `events/${eventId}/photos`, photo.id);
    const isLiked = photo.likes?.includes(user.uid);

    try {
      await updateDoc(photoRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      toast.error("Action failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Loading SnapSearch Gallery</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-[1600px] mx-auto pb-32">
      {/* Premium Editorial Header */}
      <header className="relative py-20 px-8 rounded-[3rem] overflow-hidden group">
        <div className="absolute inset-0 bg-neutral-900">
           {photos[0] && (
             <img src={photos[0].thumbnailUrl} className="w-full h-full object-cover opacity-20 blur-xl scale-110 transition-transform duration-1000 group-hover:scale-100" />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="micro-label text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">Live Production</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <h1 className="text-7xl font-black tracking-tighter text-white leading-[0.85]">
              {event?.name}
            </h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-neutral-400">
                <Camera className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">{event?.photographerName || 'SnapSearch Artist'}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <Globe className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">{new Date(event?.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="px-10 py-5 bg-white text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-2xl shadow-white/10"
            >
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Find My Face
            </button>
            <button className="p-5 glass-card rounded-2xl text-white hover:bg-white/10 transition-all">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-white/5 p-1.5 rounded-2xl border border-neutral-200 dark:border-white/5">
          {['all', 'highlights', 'recent'].map(t => (
            <button 
              key={t}
              onClick={() => setFilter(t)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === t ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-neutral-400 font-black text-[10px] uppercase tracking-widest">
          <Filter className="w-4 h-4" />
          {photos.length} Captured Moments
        </div>
      </div>

      {/* Pinterest-style Masonry Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 px-4">
        {photos.map((photo, i) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="mb-6 break-inside-avoid"
          >
            <div 
              className="relative group cursor-zoom-in rounded-[2rem] overflow-hidden glass-card border-none"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo.thumbnailUrl} 
                alt="Event moment"
                className="w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-8 flex flex-col justify-end">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleLike(photo); }}
                      className={`p-3 rounded-xl transition-all ${photo.likes?.includes(user?.uid) ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'}`}
                    >
                      <Heart className={`w-5 h-5 ${photo.likes?.includes(user?.uid) ? 'fill-current' : ''}`} />
                    </button>
                    <button className="p-3 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md rounded-xl transition-all">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="px-4 py-2 bg-indigo-600/80 backdrop-blur-md rounded-xl text-[9px] font-black uppercase tracking-widest text-white">
                    4K Pro
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-12"
          >
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-10 right-10 p-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-10 h-10" />
            </button>

            <motion.div 
              layoutId={selectedPhoto.id}
              className="max-w-6xl w-full max-h-full relative group"
            >
              <img 
                src={selectedPhoto.url} 
                className="w-full h-full object-contain rounded-3xl shadow-2xl"
              />
              
              <div className="absolute bottom-[-80px] left-1/2 -translate-x-1/2 flex items-center gap-6">
                <button className="px-8 py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl">
                  <Download className="w-4 h-4" /> Download Original
                </button>
                <button className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 backdrop-blur-md border border-white/10">
                  <Share2 className="w-4 h-4" /> Share Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
