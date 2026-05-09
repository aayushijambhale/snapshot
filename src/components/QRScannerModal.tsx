import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const scannerId = "qr-reader";

  useEffect(() => {
    if (isOpen && !scannerRef.current) {
      startScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setError(null);
    setIsScanning(true);
    
    try {
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore verbose logs, just for debugging
          // console.log(errorMessage);
        }
      );
    } catch (err: any) {
      console.error("Scanner Error:", err);
      setError("Unable to access camera. Please ensure permissions are granted.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = (decodedText: string) => {
    // Expected format: https://domain.com/event/EVENT_ID or just EVENT_ID
    let eventId = decodedText;
    
    try {
      if (decodedText.includes('/event/')) {
        const parts = decodedText.split('/event/');
        eventId = parts[parts.length - 1].split('?')[0]; // Remove query params if any
      }
      
      if (eventId && eventId.length > 5) {
        toast.success("Event Found!");
        stopScanner();
        onClose();
        navigate(`/event/${eventId}`);
      } else {
        toast.error("Invalid QR Code for Snapshot Event");
      }
    } catch (err) {
      toast.error("Could not parse QR code");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter dark:text-white">QR Scanner</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Scan event code to join instantly</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>

            {/* Scanner Area */}
            <div className="p-8 space-y-8">
              <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-[2rem] overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-4 border-white dark:border-neutral-800 shadow-inner">
                <div id={scannerId} className="w-full h-full object-cover" />
                
                {/* Overlay Scanning Effect */}
                {isScanning && !error && (
                  <>
                    <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />
                    <motion.div 
                      animate={{ y: [0, 240, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute top-0 left-[40px] right-[40px] h-1 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] z-10"
                    />
                    
                    {/* Corners */}
                    <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                    <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                    <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                    <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
                  </>
                )}

                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-neutral-50 dark:bg-neutral-800">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                      <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">{error}</p>
                    <button
                      onClick={startScanner}
                      className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-orange-200 dark:shadow-none"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {!isScanning && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* Tips Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/20 flex flex-col gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-tight">
                    Hold steady for 2-3 seconds until the event is identified.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/20 flex flex-col gap-2">
                  <Camera className="w-5 h-5 text-orange-500" />
                  <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 leading-tight">
                    Ensure the QR code is within the frame and well-lit.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-neutral-50 dark:bg-neutral-800/50 flex justify-center">
              <button
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Close Scanner
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
