import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Plus, 
  Grid, 
  ArrowRight, 
  Settings, 
  Image as ImageIcon, 
  Calendar, 
  MapPin, 
  Loader2, 
  Sparkles, 
  Activity, 
  Trash2,
  Zap,
  Globe,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { CreateEventModal } from './CreateEventModal';

export function PhotographerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalPhotos: 0,
    totalStorage: '1.2 GB'
  });

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event purged from SnapSearch');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete event');
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'events'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventList);
      
      let photoCount = 0;
      eventList.forEach(e => photoCount += (e.fileCount || 0));
      
      setStats(prev => ({
        ...prev,
        totalEvents: eventList.length,
        totalPhotos: photoCount
      }));
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32">
      {/* Studio Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-2xl shadow-indigo-600/30">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1">
              <span className="micro-label text-indigo-600">Production Studio</span>
              <p className="text-xs font-bold text-neutral-400">SnapSearch Artist Console</p>
            </div>
          </div>
          <h1 className="text-7xl font-black tracking-tighter dark:text-white leading-[0.85]">
            Creator <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400">Command.</span>
          </h1>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-12 py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/10 flex items-center gap-4 group"
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          Create Production
        </button>
      </header>

      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      {/* Advanced Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Active Productions', value: stats.totalEvents, icon: Grid, color: 'indigo' },
          { label: 'Moments Captured', value: stats.totalPhotos, icon: ImageIcon, color: 'purple' },
          { label: 'Drive Utilization', value: stats.totalStorage, icon: Zap, color: 'cyan' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-10 rounded-[2.5rem] flex items-center justify-between group"
          >
            <div className="space-y-4">
              <p className="micro-label text-neutral-400">{stat.label}</p>
              <h3 className="text-5xl font-black dark:text-white group-hover:scale-110 transition-transform origin-left">{stat.value}</h3>
            </div>
            <div className={`p-6 rounded-[2rem] bg-${stat.color}-500/10 text-${stat.color}-500 border border-${stat.color}-500/20`}>
              <stat.icon className="w-8 h-8" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Production Registry */}
      <section className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-3xl font-black tracking-tight dark:text-white flex items-center gap-4">
            <Activity className="w-7 h-7 text-indigo-600" />
            Active Galleries
          </h2>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Live Syncing</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {events.length > 0 ? (
            events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-10 rounded-[3.5rem] group hover:border-indigo-600/30 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => navigate(`/event/${event.id}`)}
              >
                <div className="space-y-10 relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <h3 className="text-4xl font-black dark:text-white tracking-tight group-hover:text-indigo-600 transition-colors">{event.name}</h3>
                         <div className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[9px] font-black uppercase tracking-widest">4K Pro</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.location || 'Remote Hub'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                            handleDeleteEvent(event.id);
                          }
                        }}
                        className="p-4 bg-red-500/10 text-red-500 rounded-[1.5rem] hover:bg-red-500 hover:text-white transition-all shadow-xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <div className="p-4 bg-neutral-100 dark:bg-white/10 rounded-[1.5rem] group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl">
                        <ArrowRight className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-neutral-50 dark:bg-white/5 rounded-[2rem] border border-neutral-100 dark:border-white/10 space-y-1">
                      <p className="micro-label text-neutral-400">Moments</p>
                      <p className="text-2xl font-black dark:text-white">{event.fileCount || 0}</p>
                    </div>
                    <div className="p-6 bg-neutral-50 dark:bg-white/5 rounded-[2rem] border border-neutral-100 dark:border-white/10 space-y-1">
                      <p className="micro-label text-neutral-400">Access</p>
                      <p className="text-2xl font-black dark:text-white">{event.isPublic !== false ? 'Public' : 'Protected'}</p>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-colors" />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-40 text-center glass-card rounded-[4rem] border-2 border-dashed border-neutral-200 dark:border-white/10">
              <p className="text-neutral-500 text-lg font-bold">Launch your first production to start capturing.</p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-6 text-indigo-600 font-black uppercase tracking-[0.3em] text-xs hover:underline"
              >
                Initialize Cluster
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
