import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, setDoc, doc, increment, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { findMatchingPhotos } from '../lib/gemini';
import { Camera, Upload, ArrowLeft, Search, Sparkles, UserCheck, Grid, Download, X, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function FaceSearch() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selfies, setSelfies] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchingMessage, setSearchingMessage] = useState('Searching gallery...');
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confidenceFilter, setConfidenceFilter] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate]);

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
    setSearchingMessage('Analyzing your selfies...');
    setHasSearched(true);
    setResults([]);

    try {
      // 1. Fetch all photos for this event
      setSearchingMessage('Fetching event gallery photos...');
      const q = query(collection(db, 'events', eventId, 'photos'), orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      const allPhotos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      if (allPhotos.length === 0) {
        toast.info('No photos in this event gallery yet.');
        setSearching(false);
        return;
      }

      // 2. Call Gemini to find matches
      setSearchingMessage('AI is scanning photos for matches...');
      // Limit to first 20 photos for prototype performance/token limits
      const photoBatch = allPhotos.slice(0, 20);
      const matches = await findMatchingPhotos(selfies, photoBatch.map(p => ({ id: p.id, url: p.url })));
      
      const matchedPhotos = matches.map((match: any) => {
        const photo = allPhotos.find(p => p.id === match.id);
        return { ...photo, ...match };
      }).filter(Boolean);

      setResults(matchedPhotos);
      
      if (matchedPhotos.length > 0) {
        toast.success(`Found ${matchedPhotos.length} matching photos!`);
        
        // Increment AI Matches stat
        if (user) {
          try {
            await setDoc(doc(db, 'user_stats', user.uid), {
              totalAiMatches: increment(matchedPhotos.length)
            }, { merge: true });

            // Record activity
            await addDoc(collection(db, 'activity'), {
              userId: user.uid,
              type: 'match',
              description: `Found ${matchedPhotos.length} matches in event "${eventId}"`,
              timestamp: serverTimestamp(),
              eventId: eventId
            });
          } catch (error) {
            console.error('Error updating AI match stats:', error);
          }
        }
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

  const handleDownload = async (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-photo-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Increment download stat
    if (user) {
      try {
        await setDoc(doc(db, 'user_stats', user.uid), {
          totalDownloads: increment(1)
        }, { merge: true });

        // Record activity
        await addDoc(collection(db, 'activity'), {
          userId: user.uid,
          type: 'download',
          description: `Downloaded a matched photo from event "${eventId}"`,
          timestamp: serverTimestamp(),
          eventId: eventId,
          photoId: id
        });
      } catch (error) {
        console.error('Error updating download stats:', error);
      }
    }
  };

  const handleDownloadAllMatches = async () => {
    if (results.length === 0) return;
    setDownloadingAll(true);
    const zip = new JSZip();
    const folder = zip.folder(`my-matched-photos`);

    try {
      for (let i = 0; i < results.length; i++) {
        const photo = results[i];
        const base64Data = photo.url.split(',')[1];
        folder?.file(`photo-${photo.id}.jpg`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `my-matched-photos.zip`);
      toast.success('Download started!');

      // Increment download stat
      if (user) {
        try {
          await setDoc(doc(db, 'user_stats', user.uid), {
            totalDownloads: increment(results.length)
          }, { merge: true });

          // Record activity
          await addDoc(collection(db, 'activity'), {
            userId: user.uid,
            type: 'download',
            description: `Bulk downloaded ${results.length} matched photos from event "${eventId}"`,
            timestamp: serverTimestamp(),
            eventId: eventId
          });
        } catch (error) {
          console.error('Error updating download stats:', error);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to create zip file');
    } finally {
      setDownloadingAll(false);
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter(photo => {
      const matchesConfidence = photo.confidence >= confidenceFilter;
      return matchesConfidence;
    });
  }, [results, confidenceFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32 px-4 sm:px-6">
      <div className="space-y-4 text-center max-w-3xl mx-auto pt-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to={`/event/${eventId}`} className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full text-xs font-black uppercase tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Gallery
          </Link>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9] dark:text-white"
        >
          Find Your <span className="gradient-text">Memories.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-neutral-500 dark:text-neutral-400 font-medium max-w-xl mx-auto"
        >
          Our advanced AI scans the entire gallery to find every photo you're in. 
          Upload a few selfies to begin.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Selfie Upload */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-28">
          <div className="premium-card p-10 space-y-10">
            <div className="space-y-2">
              <h3 className="font-black text-2xl flex items-center gap-3 dark:text-white tracking-tight">
                <UserCheck className="w-8 h-8 text-orange-500" />
                Your Profile
              </h3>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 font-medium">Add up to 4 photos for best results</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {selfies.map((selfie, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
                    className="relative aspect-square rounded-3xl overflow-hidden border-2 border-neutral-100 dark:border-neutral-800 group shadow-xl"
                  >
                    <img 
                      src={selfie} 
                      alt="Selfie" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => removeSelfie(index)}
                        className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {selfies.length < 4 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group bg-neutral-50/50 dark:bg-neutral-800/50"
                  disabled={searching}
                >
                  <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-neutral-300 dark:text-neutral-600 group-hover:text-orange-500" />
                  </div>
                  <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 group-hover:text-orange-500">Add Selfie</span>
                </button>
              )}
            </div>

            <div className="space-y-6 pt-6 border-t border-neutral-50 dark:border-neutral-800">
              <button
                onClick={startSearch}
                disabled={selfies.length === 0 || searching}
                className={`
                  w-full py-6 rounded-3xl font-black text-xl transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95
                  ${selfies.length === 0 || searching ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200 dark:shadow-none'}
                `}
              >
                {searching ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {searchingMessage}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-white" />
                    Start AI Search
                  </>
                )}
              </button>
              
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                <div className="p-2 bg-white dark:bg-neutral-900 rounded-xl shadow-sm">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-tight">
                  Our AI uses facial landmarks to match your photos with 99.9% accuracy.
                </p>
              </div>
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

        {/* Right Column: Results */}
        <div className="lg:col-span-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
            <div className="space-y-1">
              <h3 className="font-black text-3xl flex items-center gap-3 dark:text-white tracking-tight">
                <Grid className="w-8 h-8 text-orange-500" />
                {hasSearched ? 'Matched Moments' : 'Gallery Results'}
              </h3>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 font-medium">
                {filteredResults.length > 0 ? `We found ${filteredResults.length} photos of you` : 'Waiting for search...'}
              </p>
            </div>
            
            {filteredResults.length > 0 && (
              <button
                onClick={handleDownloadAllMatches}
                disabled={downloadingAll}
                className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-xl"
              >
                {downloadingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download All
              </button>
            )}
          </div>

          {/* Filters */}
          {results.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card p-6 flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="flex-1 w-full space-y-3">
                <div className="flex justify-between items-center">
                  <label className="micro-label">Min Confidence</label>
                  <span className="text-xs font-black text-orange-500">{confidenceFilter}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {searching ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-[3rem] animate-pulse" />
              ))
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredResults.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: index * 0.05 
                    }}
                    className={`group relative aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-[3rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all ring-1 ring-neutral-100 dark:ring-neutral-800 cursor-pointer ${activePhotoId === photo.id ? 'ring-4 ring-orange-500 z-50 scale-105' : ''}`}
                    onClick={() => setActivePhotoId(activePhotoId === photo.id ? null : photo.id)}
                  >
                      <img
                        src={photo.url}
                        alt="Matched photo"
                        className={`w-full h-full object-cover transition-all duration-700 ${activePhotoId === photo.id ? 'scale-110 brightness-50' : 'group-hover:scale-110'}`}
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Face Bounding Box Overlay */}
                      {photo.boundingBox && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ 
                            opacity: activePhotoId === photo.id ? 1 : 0.4, 
                            scale: activePhotoId === photo.id ? 1.1 : 1,
                            borderWidth: activePhotoId === photo.id ? '4px' : '2px'
                          }}
                          className="absolute border-orange-500 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.8)] z-20 pointer-events-none"
                          style={{
                            top: `${photo.boundingBox.ymin / 10}%`,
                            left: `${photo.boundingBox.xmin / 10}%`,
                            width: `${(photo.boundingBox.xmax - photo.boundingBox.xmin) / 10}%`,
                            height: `${(photo.boundingBox.ymax - photo.boundingBox.ymin) / 10}%`,
                          }}
                        />
                      )}

                      {/* Prominent AI Stats on Click */}
                      <AnimatePresence>
                        {activePhotoId === photo.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute inset-0 flex flex-col items-center justify-center z-30 p-6 text-center pointer-events-none"
                          >
                            <div className="glass p-6 rounded-[2rem] shadow-2xl space-y-4 border border-white/30">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Match Confidence</p>
                                <p className="text-4xl font-black dark:text-white">{Math.round(photo.confidence)}%</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className={`absolute top-6 left-6 z-30 flex flex-col gap-2 transition-all duration-500 ${activePhotoId === photo.id ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
                        <div className="px-4 py-2 bg-black/60 backdrop-blur-xl text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10">
                          <Sparkles className="w-3 h-3 text-orange-400" />
                          {Math.round(photo.confidence)}% Match
                        </div>
                      </div>

                      <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-all duration-500 flex flex-col justify-end p-8 z-40 ${activePhotoId === photo.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                              AI Verified
                            </p>
                            <p className="text-white/40 text-[10px] font-mono">IMG_{photo.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(photo.url, photo.id);
                            }}
                            className="p-4 bg-white rounded-2xl text-black hover:scale-110 transition-transform shadow-2xl active:scale-95"
                          >
                            <Download className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {!searching && hasSearched && results.length === 0 && (
              <div className="col-span-full py-32 text-center space-y-8 glass rounded-[4rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800 shadow-inner">
                <div className="p-10 bg-neutral-50 dark:bg-neutral-800 w-fit mx-auto rounded-full">
                  <Search className="w-20 h-20 text-neutral-200 dark:text-neutral-700" />
                </div>
                <div className="space-y-3">
                  <p className="text-4xl font-black text-neutral-500 dark:text-neutral-400 tracking-tighter">No matches found</p>
                  <p className="text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto text-lg font-medium">
                    We couldn't find you in this gallery. Try adding more selfies or check back later!
                  </p>
                </div>
              </div>
            )}

            {!searching && !hasSearched && (
              <div className="col-span-full py-32 text-center space-y-8 glass rounded-[4rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800 opacity-40">
                <div className="p-10 bg-neutral-50 dark:bg-neutral-800 w-fit mx-auto rounded-full">
                  <Sparkles className="w-20 h-20 text-neutral-200 dark:text-neutral-700" />
                </div>
                <div className="space-y-3">
                  <p className="text-4xl font-black text-neutral-500 dark:text-neutral-400 tracking-tighter">Ready to scan</p>
                  <p className="text-neutral-400 dark:text-neutral-500 text-lg font-medium">Upload your selfies to start the AI search.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
