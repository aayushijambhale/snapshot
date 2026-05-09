import React, { useState } from 'react';
import { QrCode, ArrowRight, Zap, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { QRScannerModal } from './QRScannerModal';

export function QRSection() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <div className="relative">
      <motion.div
        whileHover={{ y: -5 }}
        className="premium-card p-8 group overflow-hidden relative"
      >
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <QrCode className="w-32 h-32" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <span className="micro-label text-orange-500">Quick Access</span>
            </div>

            <div className="space-y-3">
              <h3 className="text-3xl sm:text-4xl font-black tracking-tighter dark:text-white">
                Scan to <span className="gradient-text">Join.</span>
              </h3>
              <p className="text-lg text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed max-w-md">
                Have an event QR code? Scan it to instantly join the gallery and start finding your photos.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="btn-primary px-8 py-4 text-base shadow-2xl active:scale-95 group"
              >
                <Camera className="w-5 h-5" />
                Open Scanner
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="flex items-center gap-3 px-4 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Mobile Friendly</span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-64 aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-[3rem] border-4 border-white dark:border-neutral-800 shadow-inner flex items-center justify-center relative">
             {/* Mock QR in UI */}
             <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-neutral-100 dark:border-neutral-800">
                <QrCode className="w-24 h-24 text-black dark:text-white opacity-20" />
             </div>
             
             {/* Animated Scan Line */}
             <motion.div 
               animate={{ y: [-40, 40, -40] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute left-12 right-12 h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
             />
          </div>
        </div>
      </motion.div>

      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </div>
  );
}
