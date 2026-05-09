import React from 'react';
import { Heart, MessageCircle, Download, Share2, ZoomIn } from 'lucide-react';
import { motion } from 'motion/react';

interface ImageCardProps {
  photo: any;
  onClick?: () => void;
  onDownload?: () => void;
}

export function ImageCard({ photo, onClick, onDownload }: ImageCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative aspect-[3/4] rounded-3xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl"
    >
      <img
        src={photo.url}
        alt={photo.caption || 'Event photo'}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 cursor-pointer"
        onClick={onClick}
      >
        <div className="absolute top-4 right-4 flex gap-2">
           <button className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-orange-500 transition-colors">
             <Share2 className="w-4 h-4" />
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onDownload?.(); }}
             className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-orange-500 transition-colors"
           >
             <Download className="w-4 h-4" />
           </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6 space-y-3">
          <p className="text-white font-bold text-sm line-clamp-2 leading-tight">
            {photo.caption || 'Captured Moment'}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-black uppercase tracking-widest">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                {photo.likes?.length || 0}
              </div>
              <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-black uppercase tracking-widest">
                <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                {photo.comments?.length || 0}
              </div>
            </div>
            <div className="p-2 bg-orange-500 rounded-lg text-white">
              <ZoomIn className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (if matching) */}
      {photo.matching && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,1)]" />
      )}
    </motion.div>
  );
}
