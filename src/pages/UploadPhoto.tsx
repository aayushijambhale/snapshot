import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { doc, getDoc } from '../lib/db';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { useUploads } from '../context/UploadContext';
import { Upload, X, Image as ImageIcon, ArrowLeft, CheckCircle2, Tag, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface PhotoMetadata {
  id: string;
  file: File;
  preview: string;
  caption: string;
  tags: string;
}

export function UploadPhoto() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { queueUploads, currentTask } = useUploads();
  const [photoData, setPhotoData] = useState<PhotoMetadata[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      tags: '',
    }));
    setPhotoData(prev => [...prev, ...newPhotos]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] }
  } as any);

  const removePhoto = (id: string) => {
    setPhotoData(prev => prev.filter(p => p.id !== id));
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

    if (currentTask?.isProcessing) {
        toast.error('An upload is already in progress. Please wait for it to complete.');
        return;
    }

    try {
      // 0. Fetch Event to get Drive Folder ID
      const eventSnap = await getDoc(doc(db, 'events', eventId!));
      if (!eventSnap.exists()) {
        toast.error('Event not found');
        return;
      }
      const eventInfo = eventSnap.data();
      const driveFolderId = eventInfo.driveFolderId;

      if (!driveFolderId) {
        toast.error('This event is not linked to Google Drive storage');
        return;
      }

      // Format for background queue
      const formattedPhotos = photoData.map(p => ({
          id: p.id,
          file: p.file,
          caption: p.caption,
          tags: p.tags.split(',').map(t => t.trim()).filter(Boolean)
      }));

      // Start background upload
      queueUploads(eventId!, formattedPhotos, driveFolderId);
      
      toast.success(`Queued ${photoData.length} photos for background upload!`);
      navigate(`/event/${eventId}`);
    } catch (error) {
      console.error('Upload queue error:', error);
      toast.error('Failed to start upload');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="space-y-1">
        <Link to={`/event/${eventId}`} className="text-sm text-neutral-500 hover:text-orange-500 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Gallery
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Upload Photos</h1>
        <p className="text-neutral-500">Add your captures. They'll upload in the background while you browse.</p>
      </div>

      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer
          ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:border-neutral-300 bg-white'}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="p-4 bg-neutral-50 w-fit mx-auto rounded-full">
            <Upload className={`w-8 h-8 ${isDragActive ? 'text-orange-500' : 'text-neutral-400'}`} />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold">
              {isDragActive ? 'Drop them here!' : 'Drag & drop photos here'}
            </p>
            <p className="text-neutral-500">or click to browse from your device</p>
          </div>
          <p className="text-xs text-neutral-400">Photos will be automatically compressed for faster sharing.</p>
        </div>
      </div>

      {photoData.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-orange-500" />
              Selected Photos ({photoData.length})
            </h3>
            <button
               onClick={() => setPhotoData([])}
               className="text-sm text-red-500 font-bold hover:underline"
            >
               Clear All
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {photoData.map((photo) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm flex flex-col sm:flex-row gap-6 group relative overflow-hidden"
                >
                  <div className="relative w-full sm:w-40 aspect-square rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={photo.preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1 mr-4">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <Type className="w-3 h-3" /> Caption
                        </label>
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) => updateMetadata(photo.id, 'caption', e.target.value)}
                          placeholder="Add a caption..."
                          className="w-full px-4 py-2 bg-neutral-50 rounded-xl border border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={photo.tags}
                        onChange={(e) => updateMetadata(photo.id, 'tags', e.target.value)}
                        placeholder="e.g. candid, sunset, group"
                        className="w-full px-4 py-2 bg-neutral-50 rounded-xl border border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="fixed bottom-8 left-0 right-0 px-4 z-40">
            <div className="max-w-4xl mx-auto">
               <button
                  onClick={handleUpload}
                  className="w-full py-5 bg-black text-white rounded-full font-bold text-xl hover:bg-neutral-800 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
               >
                  <CheckCircle2 className="w-6 h-6" />
                  Start Background Upload ({photoData.length})
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
