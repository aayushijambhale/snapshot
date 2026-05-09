import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, Shield, User, Loader2, Sparkles, Zap, ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';

export function GoogleLoginSplash() {
  const { login, role, setRole } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (err) {
      console.error(err);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050507] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden transition-colors duration-1000">
      {/* Immersive Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/10 dark:bg-indigo-600/5 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-500/10 dark:bg-cyan-600/5 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-600/5 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-20 items-center z-10">
        {/* Left Side: Editorial Branding */}
        <motion.div 
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex flex-col gap-12"
        >
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[1.5rem] shadow-2xl shadow-indigo-500/40 rotate-6">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-0.5">
                <span className="micro-label text-indigo-500">SnapSearch AI</span>
                <p className="text-xs font-bold text-neutral-400">Next-Gen Media Sync</p>
              </div>
            </div>
            
            <h1 className="text-[5.5rem] font-black tracking-tighter dark:text-white leading-[0.85]">
              Find Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400">Moments.</span>
            </h1>
            
            <p className="text-xl text-neutral-500 dark:text-neutral-400 font-medium max-w-lg leading-relaxed">
              Elegant photo discovery powered by facial intelligence. A premium hub for event creators and guests.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {[
              { text: 'AI Face Search', icon: Sparkles, desc: '99.9% Match Accuracy' },
              { text: 'QR Discovery', icon: Zap, desc: 'Instant Gallery Access' },
              { text: 'Pro Cloud', icon: Shield, desc: 'Military Grade Storage' },
              { text: 'Smart Sync', icon: CheckCircle2, desc: 'Real-time Drive Uplink' }
            ].map((feature, i) => (
              <motion.div 
                key={feature.text}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="space-y-1"
              >
                <div className="flex items-center gap-2 mb-2">
                  <feature.icon className="w-4 h-4 text-indigo-500" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-neutral-800 dark:text-white">{feature.text}</span>
                </div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: Glass Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          {/* External Glow */}
          <div className="absolute -inset-4 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-cyan-500/20 blur-3xl opacity-50 rounded-[4rem]" />
          
          <div className="relative glass-card rounded-[4rem] p-10 sm:p-14 space-y-12">
            <div className="lg:hidden flex flex-col items-center text-center space-y-6 mb-4">
               <div className="p-4 bg-indigo-600 rounded-[1.25rem] shadow-xl">
                 <Camera className="w-8 h-8 text-white" />
               </div>
               <h2 className="text-5xl font-black tracking-tighter dark:text-white">SnapSearch</h2>
            </div>

            <div className="space-y-3 text-center lg:text-left">
              <h3 className="text-3xl font-black dark:text-white tracking-tight">Access Portal</h3>
              <p className="text-neutral-400 font-medium">Please select your persona to continue.</p>
            </div>

            {/* Premium Role Toggles */}
            <div className="grid grid-cols-2 gap-4 p-2 bg-neutral-100 dark:bg-white/5 rounded-[2.5rem] border border-neutral-200 dark:border-white/5">
              {[
                { id: 'organizer', label: 'Organizer', icon: Shield, theme: 'indigo' },
                { id: 'attendee', label: 'Attendee', icon: User, theme: 'cyan' }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id as any)}
                  className={`flex flex-col items-center gap-3 py-6 rounded-[2rem] transition-all relative ${
                    role === r.id 
                      ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                      : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
                  }`}
                >
                  <r.icon className={`w-6 h-6 ${role === r.id ? 'text-indigo-500' : ''}`} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">{r.label}</span>
                  {role === r.id && (
                    <motion.div layoutId="role-dot" className="absolute bottom-3 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Authenticate Action */}
            <div className="space-y-6">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full h-20 premium-gradient text-white rounded-[2.25rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 group transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 relative overflow-hidden shadow-2xl shadow-indigo-500/30"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google Authentication
                    </div>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-neutral-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Vault Secured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-neutral-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">AI Cluster 01</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-center leading-relaxed max-w-[280px] mx-auto">
              By entering, you accept our <br />
              <span className="text-indigo-500 cursor-pointer hover:underline">Service Agreements</span> & <span className="text-indigo-500 cursor-pointer hover:underline">Data Policy</span>.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Floating Theme Toggle */}
      <div className="fixed bottom-12 right-12 z-50">
        <ThemeToggle />
      </div>
    </div>
  );
}
