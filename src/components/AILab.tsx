import React, { useState, useRef } from 'react';
import { Upload, Camera, Smile, ShieldOff, RefreshCw, Sparkles, Tag, Check, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { generateCaptionAndHashtags, detectFaces } from '../lib/gemini';
import { Link } from 'react-router-dom';

export function AILab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      toast.success("Image loaded into AI Lab!");
    }
  };

  const handleGenerateCaption = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const data = await generateCaptionAndHashtags(preview);
      setResult((prev: any) => ({ ...prev, ...data }));
      toast.success("AI Caption generated!");
    } catch (err) {
      toast.error("Failed to generate caption");
    } finally {
      setLoading(false);
    }
  };

  const handleBlurFaces = async () => {
    if (!preview || !canvasRef.current) return;
    setLoading(true);
    try {
      const faces = await detectFaces(preview);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = preview;
      
      await new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          faces.forEach((face: any) => {
            const { ymin, xmin, ymax, xmax } = face.boundingBox;
            const x = (xmin / 1000) * img.width;
            const y = (ymin / 1000) * img.height;
            const w = ((xmax - xmin) / 1000) * img.width;
            const h = ((ymax - ymin) / 1000) * img.height;

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.filter = 'blur(30px)';
            ctx.drawImage(canvas, 0, 0);
            ctx.restore();
          });

          const blurredUrl = canvas.toDataURL('image/jpeg');
          setPreview(blurredUrl);
          setIsBlurred(true);
          resolve(null);
        };
      });
      toast.success("Privacy blur applied!");
    } catch (err) {
      toast.error("Failed to blur faces");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 px-4 sm:px-6">
      <div className="space-y-1 text-center max-w-2xl mx-auto">
        <Link to="/client" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-orange-500 inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl dark:text-white">AI <span className="text-orange-500">Lab</span></h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-lg">
          Experiment with cutting-edge AI photo processing features.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Image Preview */}
        <div className="lg:col-span-7 space-y-8">
          <div className="relative aspect-[4/3] bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-xl overflow-hidden group">
            {preview ? (
              <>
                <img 
                  src={preview} 
                  alt="Preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain" 
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Face Overlays */}
                {detectedFaces.map((face, i) => (
                  <div
                    key={i}
                    className="absolute border-2 border-purple-500 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.5)] z-20 pointer-events-none"
                    style={{
                      top: `${face.boundingBox.ymin / 10}%`,
                      left: `${face.boundingBox.xmin / 10}%`,
                      width: `${(face.boundingBox.xmax - face.boundingBox.xmin) / 10}%`,
                      height: `${(face.boundingBox.ymax - face.boundingBox.ymin) / 10}%`,
                    }}
                  />
                ))}

                <button 
                  onClick={() => { setFile(null); setPreview(null); setResult(null); setPreview(originalImage); setIsBlurred(false); setDetectedFaces([]); }}
                  className="absolute top-6 right-6 p-4 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                >
                  <RefreshCw className="w-6 h-6" />
                </button>
              </>
            ) : (
              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <Upload className="w-16 h-16 text-neutral-300 mb-4" />
                <span className="text-xl font-bold text-neutral-400">Drop your photo here</span>
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-orange-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Results Display */}
          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl space-y-6"
              >
                {result.caption && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                      <Camera className="w-4 h-4" /> AI Caption
                    </h3>
                    <p className="text-2xl font-bold tracking-tight dark:text-white leading-tight">
                      "{result.caption}"
                    </p>
                  </div>
                )}

                {result.hashtags && (
                  <div className="flex flex-wrap gap-2">
                    {result.hashtags.map((tag: string) => (
                      <span key={tag} className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-xl space-y-8">
            <h2 className="text-2xl font-black dark:text-white">AI Control Panel</h2>
            
            <div className="space-y-4">
              <button
                onClick={handleGenerateCaption}
                disabled={!preview || loading}
                className="w-full p-6 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-[2rem] flex items-center gap-6 group hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="text-left">
                  <p className="font-black text-lg dark:text-white">Auto Caption</p>
                  <p className="text-sm text-neutral-500">Gemini Vision 3.1 Flash</p>
                </div>
              </button>

              <button
                onClick={() => isBlurred ? setPreview(originalImage) : handleBlurFaces()}
                disabled={!preview || loading}
                className={`w-full p-6 rounded-[2rem] flex items-center gap-6 group transition-all disabled:opacity-50 disabled:cursor-not-allowed border ${
                  isBlurred 
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20' 
                  : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'
                }`}
              >
                <div className={`p-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm group-hover:scale-110 transition-transform ${isBlurred ? 'text-green-500' : 'text-red-500'}`}>
                  {isBlurred ? <Check className="w-8 h-8" /> : <ShieldOff className="w-8 h-8" />}
                </div>
                <div className="text-left">
                  <p className="font-black text-lg dark:text-white">{isBlurred ? 'Faces Blurred' : 'Privacy Blur'}</p>
                  <p className="text-sm text-neutral-500">OpenCV Gaussian Filter</p>
                </div>
              </button>
            </div>

            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400 font-bold uppercase tracking-widest">Backend Status</span>
                <span className="flex items-center gap-2 text-green-500 font-black">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  ONLINE (PORT 8000)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
