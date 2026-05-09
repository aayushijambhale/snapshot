import React, { useState, useRef, useMemo } from 'react';
import { collection, query, orderBy, getDocs, setDoc, doc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { findMatchingPhotos } from '../lib/gemini';
import { Camera, Upload, Search, Sparkles, UserCheck, Grid, Download, X, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FaceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export function FaceSearchModal({ isOpen, onClose, eventId }: FaceSearchModalProps) {
  const { user, checkServerSession } = useAuth();
  const [selfies, setSelfies] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchingMessage, setSearchingMessage] = useState('Searching gallery...');
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelfies(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const startSearch = async () => {
    if (selfies.length === 0 || !eventId) return;

    setSearching(true);
    setSearchingMessage('Analyzing your selfies...');
    setHasSearched(true);
    setResults([]);

    try {
      const q = query(collection(db, 'events', eventId, 'photos'), orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      const allPhotos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      if (allPhotos.length === 0) {
        toast.info('No photos in this event gallery yet.');
        setSearching(false);
        return;
      }

      setSearchingMessage('AI is scanning photos for matches...');
      const photoBatch = allPhotos.slice(0, 20); // Limit for performance
      const matches = await findMatchingPhotos(selfies, photoBatch.map(p => ({ id: p.id, url: p.url })));
      
      const matchedPhotos = matches.map((match: any) => {
        const photo = allPhotos.find(p => p.id === match.id);
        return { ...photo, ...match };
      }).filter(Boolean);

      setResults(matchedPhotos);
      
      if (matchedPhotos.length > 0) {
        toast.success(`Found ${matchedPhotos.length} matching photos!`);
        if (user) {
          await setDoc(doc(db, 'user_stats', user.uid), { totalAiMatches: increment(matchedPhotos.length) }, { merge: true });
        }
      } else {
        toast.info('No matching photos found.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('AI search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-photo-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = useMemo(() => {
    return results.filter(photo => photo.confidence >= confidenceFilter);
  }, [results, confidenceFilter]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={!searching ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-neutral-950 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter dark:text-white leading-none">Face Search</h3>
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-1">Find your moments using AI</p>
                </div>
              </div>
              {!searching && (
                <button onClick={onClose} className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl text-neutral-400">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Profile/Upload */}
              <div className="lg:col-span-4 space-y-6">
                <div className="premium-card p-6 space-y-6">
                   <h4 className="text-lg font-black dark:text-white flex items-center gap-2">
                     <UserCheck className="w-5 h-5 text-orange-500" /> Your Reference
                   </h4>
                   <div className="grid grid-cols-2 gap-3">
                     {selfies.map((s, i) => (
                       <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                         <img src={s} className="w-full h-full object-cover" alt="Selfie" />
                         <button onClick={() => setSelfies(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                           <X className="w-5 h-5" />
                         </button>
                       </div>
                     ))}
                     {selfies.length < 4 && (
                       <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center hover:border-orange-500 text-neutral-400">
                         <Plus className="w-5 h-5" />
                         <span className="text-[8px] font-black uppercase tracking-widest mt-1">Add Selfie</span>
                       </button>
                     )}
                   </div>
                   <button
                     onClick={startSearch}
                     disabled={selfies.length === 0 || searching}
                     className="btn-primary w-full py-4 text-base shadow-2xl disabled:opacity-50"
                   >
                     {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                     {searching ? 'AI Searching...' : 'Start AI Search'}
                   </button>
                </div>
              </div>

              {/* Results */}
              <div className="lg:col-span-8 space-y-6">
                 {hasSearched ? (
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                     {filteredResults.map(photo => (
                       <motion.div key={photo.id} layout className="relative aspect-square rounded-2xl overflow-hidden group">
                         <img src={photo.url} className="w-full h-full object-cover" alt="Match" />
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-3 transition-opacity">
                            <span className="text-white font-black text-xl">{Math.round(photo.confidence)}%</span>
                            <button onClick={() => handleDownload(photo.url, photo.id)} className="p-2 bg-orange-500 text-white rounded-lg">
                              <Download className="w-4 h-4" />
                            </button>
                         </div>
                       </motion.div>
                     ))}
                   </div>
                 ) : (
                   <div className="h-64 flex flex-col items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-[2.5rem]">
                      <Search className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-bold">Waiting for your selfie to scan...</p>
                   </div>
                 )}
              </div>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleSelfieUpload} accept="image/*" multiple className="hidden" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
