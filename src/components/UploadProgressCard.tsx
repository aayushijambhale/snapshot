import React from 'react';
import { useUploads } from '../context/UploadContext';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, ChevronDown, ChevronUp, Image as ImageIcon, X } from 'lucide-react';
import { useState } from 'react';

export function UploadProgressCard() {
  const { currentTask, clearTask } = useUploads();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentTask) return null;

  const isDone = currentTask.completedPhotos === currentTask.totalPhotos && !currentTask.isProcessing;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          className="bg-white rounded-[2rem] shadow-2xl border border-neutral-100 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-black p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 rounded-xl">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  {isDone ? 'Upload Complete' : 'Uploading...'}
                </p>
                <p className="text-sm font-bold truncate max-w-[120px]">
                  {currentTask.completedPhotos} of {currentTask.totalPhotos} photos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {isDone && (
                <button
                  onClick={clearTask}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar (Visible even when collapsed) */}
          <div className="h-1 bg-neutral-100 overflow-hidden">
            <motion.div
              className={`h-full ${isDone ? 'bg-green-500' : 'bg-orange-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${currentTask.overallProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Collapsible Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden bg-neutral-50"
              >
                <div className="p-4 max-h-60 overflow-y-auto space-y-2">
                  {currentTask.photos.map((photo) => (
                    <div key={photo.id} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-neutral-100">
                      <div className="w-10 h-10 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                         <ImageIcon className="w-full h-full p-2 text-neutral-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-bold text-neutral-500 truncate pb-1">
                            ID: {photo.id.slice(0,8)}
                         </p>
                         <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ${
                                    photo.status === 'done' ? 'bg-green-500' :
                                    photo.status === 'error' ? 'bg-red-500' :
                                    'bg-orange-500'
                                }`}
                                style={{ width: `${photo.progress}%` }}
                            />
                         </div>
                      </div>
                      <div className="flex-shrink-0">
                        {photo.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> :
                         photo.status === 'error' ? <X className="w-3.5 h-3.5 text-red-500" /> :
                         <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
