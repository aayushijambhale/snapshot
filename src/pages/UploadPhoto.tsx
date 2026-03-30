import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Upload, X, Image as ImageIcon, ArrowLeft, CheckCircle2, Tag, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

interface PhotoMetadata {
  file: File;
  preview: string;
  caption: string;
  tags: string;
}

export function UploadPhoto() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [photoData, setPhotoData] = useState<PhotoMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      tags: ''
    }));
    setPhotoData(prev => [...prev, ...newPhotos]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] }
  } as any);

  const removePhoto = (index: number) => {
    setPhotoData(prev => prev.filter((_, i) => i !== index));
  };

  const updateMetadata = (index: number, field: 'caption' | 'tags', value: string) => {
    setPhotoData(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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
      for (let i = 0; i < photoData.length; i++) {
        const { file, caption, tags } = photoData[i];
        
        // 1. Image Compression
        const options = {
          maxSizeMB: 0.8, // Firestore limit is 1MB, so we aim for 0.8MB
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        
        const compressedFile = await imageCompression(file, options);
        
        // 2. Convert to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });

        // 3. Save to Firestore
        await addDoc(collection(db, 'events', eventId!, 'photos'), {
          url: base64,
          caption: caption.trim(),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          uploadedAt: serverTimestamp(),
          uploadedBy: user.uid,
          photographerName: user.displayName,
          eventId: eventId
        });
        
        successCount++;
        setProgress(Math.round(((i + 1) / photoData.length) * 100));
      }

      toast.success(`Successfully uploaded ${successCount} photos!`);
      navigate(`/event/${eventId}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload some photos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-1">
        <Link to={`/event/${eventId}`} className="text-sm text-neutral-500 hover:text-orange-500 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Gallery
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Upload Photos</h1>
        <p className="text-neutral-500">Add your captures with captions and tags.</p>
      </div>

      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer
          ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:border-neutral-300 bg-white'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
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
              disabled={uploading}
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {photoData.map((data, index) => (
                <motion.div
                  key={data.preview}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm flex flex-col sm:flex-row gap-6 group"
                >
                  <div className="relative w-full sm:w-40 aspect-square rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={data.preview} alt="Preview" className="w-full h-full object-cover" />
                    {!uploading && (
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <Type className="w-3 h-3" /> Caption
                      </label>
                      <input
                        type="text"
                        value={data.caption}
                        onChange={(e) => updateMetadata(index, 'caption', e.target.value)}
                        placeholder="Add a caption..."
                        disabled={uploading}
                        className="w-full px-4 py-2 bg-neutral-50 rounded-xl border border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={data.tags}
                        onChange={(e) => updateMetadata(index, 'tags', e.target.value)}
                        placeholder="e.g. candid, sunset, group"
                        disabled={uploading}
                        className="w-full px-4 py-2 bg-neutral-50 rounded-xl border border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="sticky bottom-8 pt-4">
            {uploading ? (
              <div className="bg-white p-6 rounded-3xl shadow-2xl border border-neutral-100 space-y-4">
                <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-orange-500 animate-pulse">Processing & Uploading...</span>
                  <span>{progress}%</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleUpload}
                className="w-full py-5 bg-black text-white rounded-full font-bold text-xl hover:bg-neutral-800 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-6 h-6" />
                Upload {photoData.length} Photos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
