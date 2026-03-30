import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, Search, Share2, Upload, Grid, ArrowLeft, Download, Trash2, Tag, User, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function EventGallery() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEvent({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast.error('Event not found');
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

  const shareUrl = `${window.location.origin}/event/${eventId}`;

  const handleDownload = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDownload = async () => {
    if (photos.length === 0) return;
    setDownloadingAll(true);
    const zip = new JSZip();
    const folder = zip.folder(`${event?.name || 'event'}-photos`);

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const base64Data = photo.url.split(',')[1];
        folder?.file(`photo-${photo.id}.jpg`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${event?.name || 'event'}-all-photos.zip`);
      toast.success('Bulk download started!');
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

    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      await deleteDoc(doc(db, 'events', eventId!, 'photos', photoId));
      toast.success('Photo deleted');
      if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link to="/" className="text-sm text-neutral-500 hover:text-orange-500 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight">{event?.name}</h1>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {event?.creatorName || 'Anonymous'}
            </span>
            <span>•</span>
            <span>{photos.length} Photos</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="flex-1 sm:flex-none px-5 py-3 bg-white border border-neutral-200 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all shadow-sm active:scale-95"
          >
            <Share2 className="w-4 h-4" /> Share QR
          </button>
          <button
            onClick={handleBulkDownload}
            disabled={downloadingAll || photos.length === 0}
            className="flex-1 sm:flex-none px-5 py-3 bg-white border border-neutral-200 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {downloadingAll ? (
              <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Bulk Download
          </button>
          <Link
            to={`/event/${eventId}/search`}
            className="flex-1 sm:flex-none px-5 py-3 bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95"
          >
            <Search className="w-4 h-4" /> Find My Photos
          </Link>
          <Link
            to={`/event/${eventId}/upload`}
            className="flex-1 sm:flex-none px-5 py-3 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all shadow-lg active:scale-95"
          >
            <Upload className="w-4 h-4" /> Upload
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            className="group relative aspect-square bg-neutral-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
            onClick={() => setSelectedPhoto(photo)}
          >
            <img
              src={photo.url}
              alt={photo.caption || "Event photo"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              {photo.caption && (
                <p className="text-white text-xs font-medium truncate mb-1">{photo.caption}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/80 font-mono truncate">
                  By {photo.photographerName?.split(' ')[0] || 'Photog'}
                </span>
                <div className="flex gap-1">
                  {(user?.uid === photo.uploadedBy || user?.uid === event?.createdBy) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo.id, photo.uploadedBy); }}
                      className="p-1.5 bg-red-500/80 rounded-lg text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownload(photo.url, photo.id); }}
                    className="p-1.5 bg-white/80 rounded-lg text-black hover:bg-white transition-colors"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {photos.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-4 bg-white rounded-[3rem] border-2 border-dashed border-neutral-100">
            <div className="p-6 bg-neutral-50 w-fit mx-auto rounded-full">
              <Grid className="w-10 h-10 text-neutral-300" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold text-neutral-500">No photos yet</p>
              <p className="text-neutral-400">Be the first to upload photos to this event!</p>
            </div>
            <Link
              to={`/event/${eventId}/upload`}
              className="inline-block px-8 py-3 bg-black text-white rounded-full font-bold hover:bg-neutral-800 transition-all shadow-lg active:scale-95"
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
            className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-5xl w-full flex flex-col lg:flex-row gap-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-1 relative aspect-square lg:aspect-auto lg:h-[80vh] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Event photo"}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="w-full lg:w-80 space-y-6 text-white">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">{selectedPhoto.caption || "Untitled Photo"}</h3>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Uploaded by {selectedPhoto.photographerName || 'Anonymous'}</span>
                  </div>
                  {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPhoto.tags.map((tag: string) => (
                        <span key={tag} className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                  <button
                    onClick={() => handleDownload(selectedPhoto.url, selectedPhoto.id)}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all"
                  >
                    <Download className="w-5 h-5" /> Download Original
                  </button>
                  {(user?.uid === selectedPhoto.uploadedBy || user?.uid === event?.createdBy) && (
                    <button
                      onClick={() => handleDelete(selectedPhoto.id, selectedPhoto.uploadedBy)}
                      className="w-full py-4 bg-red-500/20 text-red-500 border border-red-500/30 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-5 h-5" /> Delete Photo
                    </button>
                  )}
                </div>
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
              className="bg-white p-10 rounded-[3rem] max-w-sm w-full text-center space-y-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-extrabold tracking-tight">Event QR</h3>
                <p className="text-neutral-500">Scan to join the gallery</p>
              </div>
              
              <div className="bg-neutral-50 p-8 rounded-[2rem] inline-block border border-neutral-100 shadow-inner">
                <QRCodeSVG value={shareUrl} size={200} />
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 rounded-2xl text-[10px] font-mono break-all border border-neutral-100 text-neutral-400">
                  {shareUrl}
                </div>
                <button
                  onClick={() => setShowQR(false)}
                  className="w-full py-4 bg-black text-white rounded-full font-bold hover:bg-neutral-800 transition-all shadow-lg"
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

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
