import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { findMatchingPhotos } from '../lib/gemini';
import { Camera, Upload, ArrowLeft, Search, Sparkles, UserCheck, Grid, Download, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function FaceSearch() {
  const { eventId } = useParams();
  const [selfies, setSelfies] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
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

  const removeSelfie = (index: number) => {
    setSelfies(prev => prev.filter((_, i) => i !== index));
  };

  const startSearch = async () => {
    if (selfies.length === 0 || !eventId) return;

    setSearching(true);
    setHasSearched(true);
    setResults([]);

    try {
      // 1. Fetch all photos for this event
      const q = query(collection(db, 'events', eventId, 'photos'), orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      const allPhotos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      if (allPhotos.length === 0) {
        toast.info('No photos in this event gallery yet.');
        setSearching(false);
        return;
      }

      // 2. Call Gemini to find matches
      // Limit to first 20 photos for prototype performance/token limits
      const photoBatch = allPhotos.slice(0, 20);
      const matchingIds = await findMatchingPhotos(selfies, photoBatch.map(p => ({ id: p.id, url: p.url })));
      
      const matchedPhotos = allPhotos.filter(p => matchingIds.includes(p.id));
      setResults(matchedPhotos);
      
      if (matchedPhotos.length > 0) {
        toast.success(`Found ${matchedPhotos.length} matching photos!`);
      } else {
        toast.info('No matching photos found. Try more selfies from different angles!');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('AI search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-photo-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <div className="space-y-1 text-center max-w-2xl mx-auto">
        <Link to={`/event/${eventId}`} className="text-sm text-neutral-500 hover:text-orange-500 inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Gallery
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight">AI Face Search</h1>
        <p className="text-neutral-500 text-lg">
          Upload multiple selfies from different angles to help our AI find you more accurately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-xl space-y-8 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-orange-500" />
                Reference Selfies
              </h3>
              {selfies.length > 0 && (
                <button 
                  onClick={() => setSelfies([])}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {selfies.map((selfie, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-100 group"
                  >
                    <img src={selfie} alt="Selfie" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeSelfie(index)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {selfies.length < 4 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center hover:border-orange-500 hover:bg-orange-50 transition-all group"
                >
                  <Plus className="w-6 h-6 text-neutral-300 group-hover:text-orange-500 transition-colors" />
                  <span className="text-[10px] font-bold text-neutral-400 group-hover:text-orange-500">Add Selfie</span>
                </button>
              )}
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-neutral-400 text-center">
                Tip: Use clear photos with good lighting for best results.
              </p>
              <button
                onClick={startSearch}
                disabled={selfies.length === 0 || searching}
                className={`
                  w-full py-5 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95
                  ${selfies.length === 0 || searching ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-black text-white hover:bg-neutral-800'}
                `}
              >
                {searching ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI is Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-orange-400" />
                    Find My Photos
                  </>
                )}
              </button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleSelfieUpload} 
              accept="image/*" 
              multiple
              className="hidden" 
            />
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-2xl flex items-center gap-3">
              <Grid className="w-7 h-7 text-orange-500" />
              Search Results
            </h3>
            {results.length > 0 && (
              <span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-sm font-bold">
                {results.length} Matches Found
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {results.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative aspect-square bg-neutral-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all"
                >
                  <img
                    src={photo.url}
                    alt="Matched photo"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => handleDownload(photo.url, photo.id)}
                      className="p-3 bg-white rounded-2xl text-black hover:scale-110 transition-transform shadow-xl"
                    >
                      <Download className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!searching && hasSearched && results.length === 0 && (
              <div className="col-span-full py-32 text-center space-y-6 bg-white rounded-[3rem] border-2 border-dashed border-neutral-100 shadow-inner">
                <div className="p-6 bg-neutral-50 w-fit mx-auto rounded-full">
                  <Search className="w-12 h-12 text-neutral-200" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-neutral-500">No matches found</p>
                  <p className="text-neutral-400 max-w-xs mx-auto">
                    We couldn't find you in the first 20 photos. Try adding more selfies or check back later!
                  </p>
                </div>
              </div>
            )}

            {!hasSearched && (
              <div className="col-span-full py-32 text-center space-y-6 bg-white rounded-[3rem] border-2 border-dashed border-neutral-100 opacity-40">
                <div className="p-6 bg-neutral-50 w-fit mx-auto rounded-full">
                  <Sparkles className="w-12 h-12 text-neutral-200" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-neutral-500">Ready to search</p>
                  <p className="text-neutral-400">Upload your selfies to start the AI search.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
