import React, { useState, useRef } from 'react';
import { Upload, Camera, Smile, ShieldOff, RefreshCw, Sparkles, Tag, Check, ArrowLeft, Search, Zap, Loader2, ShieldCheck, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { generateCaptionAndHashtags, detectFaces } from '../lib/gemini';
import { Link } from 'react-router-dom';

export function AILab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setOriginalImage(reader.result as string);
        setResult(null);
        setIsBlurred(false);
        setDetectedFaces([]);
      };
      reader.readAsDataURL(selectedFile);
      toast.success("Identity profile loaded!");
    }
  };

  const handleScan = async () => {
    if (!preview) return;
    setScanning(true);
    try {
      const faces = await detectFaces(preview);
      setDetectedFaces(faces);
      
      // Simulate matching logic for UI
      setTimeout(() => {
        setResult({
          caption: "AI detected 1 high-confidence match in 'Summer Gala 2024'",
          hashtags: ["Matched", "98.4%", "Verified"],
          matches: [
            { event: "Summer Gala 2024", confidence: 98.4, date: "2024-06-12" }
          ]
        });
        setScanning(false);
        toast.success("Matching cycle complete!");
      }, 3000);
    } catch (err) {
      toast.error("Scanning node failed");
      setScanning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32 px-4">
      {/* Header */}
      <div className="space-y-8">
        <Link to="/" className="group flex items-center gap-3 text-neutral-400 hover:text-indigo-600 transition-colors">
          <div className="p-2.5 glass-card rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="micro-label">Exit to Hub</span>
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-600/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-1">
                <span className="micro-label text-indigo-600">Neural Engine</span>
                <p className="text-xs font-bold text-neutral-400">v4.2 Identity Core</p>
              </div>
            </div>
            <h1 className="text-7xl font-black tracking-tighter dark:text-white leading-[0.85]">
              AI Facial <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400">Analysis.</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-neutral-100 dark:bg-white/5 p-2 rounded-3xl border border-neutral-200 dark:border-white/5">
             <div className="px-6 py-3 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white">Gemini Pro Vision: Active</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Scanning Interface */}
        <div className="lg:col-span-7 space-y-10">
          <div className="relative aspect-[4/3] glass-card rounded-[4rem] overflow-hidden group border-none shadow-none bg-neutral-100 dark:bg-white/5">
            {preview ? (
              <>
                <img 
                  src={preview} 
                  alt="Identity Profile" 
                  className="w-full h-full object-contain p-8" 
                />
                
                {/* AI Scanning Beam */}
                <AnimatePresence>
                  {scanning && (
                    <motion.div 
                      initial={{ top: '0%' }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(6,182,212,1)] z-30"
                    />
                  )}
                </AnimatePresence>

                {/* Face Bounding Box (Simulated) */}
                {detectedFaces.map((face, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute border-2 border-cyan-400 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.4)] z-20 flex flex-col items-center"
                    style={{
                      top: `${face.boundingBox.ymin / 10}%`,
                      left: `${face.boundingBox.xmin / 10}%`,
                      width: `${(face.boundingBox.xmax - face.boundingBox.xmin) / 10}%`,
                      height: `${(face.boundingBox.ymax - face.boundingBox.ymin) / 10}%`,
                    }}
                  >
                    <div className="absolute -top-10 bg-cyan-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-black">
                      Identity Confirmed
                    </div>
                  </motion.div>
                ))}

                <button 
                  onClick={() => { setFile(null); setPreview(null); setResult(null); setDetectedFaces([]); }}
                  className="absolute top-10 right-10 p-5 bg-white/10 dark:bg-black/50 text-white rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all backdrop-blur-2xl hover:bg-red-500/80"
                >
                  <RefreshCw className="w-6 h-6" />
                </button>
              </>
            ) : (
              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-500/5 transition-all group">
                <div className="w-24 h-24 bg-white dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl border border-neutral-200 dark:border-white/10 group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <Camera className="w-10 h-10 text-indigo-600" />
                </div>
                <span className="text-2xl font-black dark:text-white tracking-tight">Upload Identity Profile</span>
                <p className="text-neutral-400 font-medium mt-2">JPEG, PNG or ProRAW supported</p>
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
            )}
          </div>
        </div>

        {/* Results & Metadata */}
        <div className="lg:col-span-5 space-y-8">
          <div className="glass-card p-10 rounded-[3.5rem] space-y-10">
            <h2 className="text-3xl font-black dark:text-white flex items-center gap-4">
               <Zap className="w-7 h-7 text-indigo-500" /> Analysis Hub
            </h2>

            <div className="space-y-4">
              <button
                onClick={handleScan}
                disabled={!preview || scanning}
                className="w-full p-8 bg-indigo-600 text-white rounded-[2.5rem] flex items-center gap-8 group hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-2xl shadow-indigo-600/30"
              >
                <div className="p-4 bg-white/20 rounded-2xl group-hover:rotate-12 transition-transform">
                  {scanning ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
                </div>
                <div className="text-left">
                  <p className="font-black text-xl tracking-tight">{scanning ? 'Synthesizing...' : 'Start Matching'}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Parallel GPU Processing</p>
                </div>
              </button>

              <button
                onClick={async () => {
                  if (!preview) return;
                  setLoading(true);
                  try {
                    const data = await generateCaptionAndHashtags(preview);
                    setResult((prev: any) => ({ ...prev, ...data }));
                    toast.success("AI Description generated!");
                  } catch (err) {
                    toast.error("Generation failed");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!preview || loading}
                className="w-full p-8 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-[2.5rem] flex items-center gap-8 group hover:bg-neutral-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:scale-110 transition-transform">
                  {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8" />}
                </div>
                <div className="text-left">
                  <p className="font-black text-xl tracking-tight dark:text-white">Auto Caption</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Gemini 3.1 Synthesis</p>
                </div>
              </button>

              <button
                disabled={!preview || scanning}
                className="w-full p-8 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-[2.5rem] flex items-center gap-8 group hover:bg-neutral-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="text-left">
                  <p className="font-black text-xl tracking-tight dark:text-white">Smart Anonymize</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Apply Privacy Gradient</p>
                </div>
              </button>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-10 border-t border-neutral-100 dark:border-white/5"
                >
                  <div className="flex items-center justify-between">
                     <span className="micro-label text-neutral-400">Match Confidence</span>
                     <span className="text-2xl font-black text-cyan-500">98.4%</span>
                  </div>
                  
                  {result.caption && (
                    <div className="p-8 bg-indigo-500/5 border border-indigo-500/20 rounded-[2.5rem] space-y-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        <span className="micro-label text-indigo-500">AI Transcription</span>
                      </div>
                      <p className="text-xl font-black dark:text-white leading-tight italic">
                        "{result.caption}"
                      </p>
                    </div>
                  )}

                  <div className="p-8 bg-cyan-500/5 border border-cyan-500/20 rounded-[2.5rem] flex items-center gap-6">
                    <div className="p-4 bg-cyan-500 text-black rounded-2xl shadow-xl shadow-cyan-500/20">
                      <Heart className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-1">Found in Event</p>
                      <p className="text-xl font-black dark:text-white">Summer Gala 2024</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {result.hashtags.map((tag: string) => (
                      <span key={tag} className="px-6 py-2.5 bg-neutral-100 dark:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
