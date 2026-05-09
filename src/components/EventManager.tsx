import React, { useState } from 'react';
import { useEventStore } from '../lib/eventStore';
import { Plus, Calendar, MapPin, ArrowRight, Loader2, Search, Filter, Sparkles, Zap, Camera, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export function EventManager() {
  const { events, loading } = useEventStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.location?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Loading Global Cluster</p>
      </div>
    );
  }

  return (
    <div className="space-y-16 max-w-7xl mx-auto pb-32">
      {/* Dynamic Home Header */}
      <header className="relative py-24 px-12 rounded-[4rem] overflow-hidden group">
        <div className="absolute inset-0 bg-neutral-900">
           <div className="absolute top-[-30%] right-[-10%] w-[80%] h-[80%] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" />
           <div className="absolute bottom-[-30%] left-[-10%] w-[60%] h-[60%] bg-cyan-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
        </div>
        
        <div className="relative z-10 space-y-8 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="micro-label text-cyan-400 bg-cyan-400/10 px-4 py-1 rounded-full border border-cyan-400/20">Discovery Portal</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <h1 className="text-7xl font-black tracking-tighter text-white leading-[0.85]">
            Explore <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400">Productions.</span>
          </h1>
          <p className="text-xl text-neutral-400 font-medium leading-relaxed">
            Access thousands of captured moments across our global network of verified events.
          </p>
        </div>
      </header>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight dark:text-white">Active Registry</h2>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{filteredEvents.length} Nodes Found</span>
             <div className="w-1 h-1 bg-neutral-300 rounded-full" />
             <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Global Search: ON</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Scan productions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-14 pr-8 py-4 bg-white dark:bg-white/5 rounded-[1.75rem] text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none transition-all w-full lg:w-80 shadow-xl shadow-black/5"
            />
          </div>
          <button className="p-4 glass-card rounded-2xl text-neutral-500 hover:text-indigo-600 transition-all">
            <Filter className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        {filteredEvents.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-8 group cursor-pointer hover:border-indigo-500/30 transition-all relative overflow-hidden"
            onClick={() => navigate(`/event/${event.id}`)}
          >
            <div className="space-y-8 relative z-10">
              <div className="flex justify-between items-start">
                <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:rotate-12 transition-transform">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="w-10 h-10 rounded-xl border-4 border-white dark:border-neutral-900 bg-neutral-200 dark:bg-neutral-800 overflow-hidden shadow-xl">
                      <img src={`https://picsum.photos/seed/${event.id + j}/100`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                   <h3 className="text-2xl font-black dark:text-white group-hover:text-indigo-600 transition-colors">{event.name}</h3>
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div className="flex items-center gap-6">
                   <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                     <Calendar className="w-4 h-4" /> {new Date(event.date).toLocaleDateString()}
                   </span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                     <MapPin className="w-4 h-4" /> {event.location || 'Global Hub'}
                   </span>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Zap className="w-3.5 h-3.5 text-indigo-500" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{event.fileCount || 0} Assets</span>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-white/5 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                   <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Decor */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
