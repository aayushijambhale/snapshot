import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  Users, 
  Calendar, 
  Image as ImageIcon, 
  Trash2, 
  AlertCircle, 
  Search, 
  ChevronRight, 
  Activity, 
  Zap, 
  Loader2, 
  Filter, 
  Eye,
  ArrowUpRight,
  TrendingUp,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

type AdminTab = 'overview' | 'events' | 'users' | 'moderation';

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalPhotos: 0,
    activeUsers: 0
  });

  useEffect(() => {
    const unsubscribeEvents = onSnapshot(query(collection(db, 'events'), orderBy('createdAt', 'desc')), (snapshot) => {
      const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventList);
      
      let photoCount = 0;
      eventList.forEach(e => photoCount += (e.fileCount || 0));
      setStats(prev => ({
        ...prev,
        totalEvents: eventList.length,
        totalPhotos: photoCount,
        activeUsers: new Set(eventList.map(e => e.createdBy)).size
      }));
      setLoading(false);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'user_stats'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeActivities = onSnapshot(query(collection(db, 'activity'), orderBy('timestamp', 'desc'), where('timestamp', '!=', null)), (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 10));
    });

    return () => {
      unsubscribeEvents();
      unsubscribeUsers();
      unsubscribeActivities();
    };
  }, []);

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Delete this event and all associated data?")) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success("Event removed");
    } catch (err) {
      toast.error("Deletion failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32">
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-2xl shadow-indigo-600/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1">
              <span className="micro-label text-indigo-600">Platform Governance</span>
              <p className="text-xs font-bold text-neutral-400">SnapSearch Core Control</p>
            </div>
          </div>
          <h1 className="text-7xl font-black tracking-tighter dark:text-white leading-[0.85]">
            Global <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400">Operations.</span>
          </h1>
        </div>

        <nav className="flex bg-neutral-100 dark:bg-white/5 p-2 rounded-[2.5rem] border border-neutral-200/50 dark:border-white/5">
          {(['overview', 'events', 'users'] as AdminTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-2xl' 
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'overview' && (
        <div className="space-y-16">
          {/* Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: 'Network Events', value: stats.totalEvents, icon: Calendar, color: 'indigo' },
              { label: 'Media Assets', value: stats.totalPhotos, icon: ImageIcon, color: 'purple' },
              { label: 'Verified Nodes', value: users.length, icon: Users, color: 'cyan' }
            ].map((stat, i) => (
              <motion.div 
                key={stat.label} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }} 
                className="glass-card p-10 rounded-[2.5rem] flex items-center justify-between group overflow-hidden"
              >
                <div className="space-y-4">
                  <p className="micro-label text-neutral-400">{stat.label}</p>
                  <h3 className="text-5xl font-black dark:text-white group-hover:scale-110 transition-transform origin-left">{stat.value}</h3>
                  <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +12% vs last month
                  </div>
                </div>
                <div className={`p-6 rounded-[2rem] bg-${stat.color}-500/10 text-${stat.color}-500 border border-${stat.color}-500/20`}>
                  <stat.icon className="w-10 h-10" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             {/* Recent Activity */}
             <section className="glass-card p-10 rounded-[3rem] space-y-10">
               <div className="flex items-center justify-between">
                 <h3 className="text-3xl font-black dark:text-white flex items-center gap-4">
                   <Activity className="w-7 h-7 text-indigo-500" /> Flux Log
                 </h3>
                 <ArrowUpRight className="w-6 h-6 text-neutral-400 hover:text-indigo-500 cursor-pointer" />
               </div>
               <div className="space-y-6">
                 {activities.map((act) => (
                   <div key={act.id} className="flex items-center gap-5 p-5 bg-neutral-50 dark:bg-white/5 rounded-2xl border border-neutral-100 dark:border-white/5 group hover:border-indigo-500/30 transition-all">
                     <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl group-hover:rotate-12 transition-transform"><Zap className="w-5 h-5" /></div>
                     <div className="flex-1 space-y-1">
                       <p className="text-sm font-bold dark:text-white leading-tight">{act.description}</p>
                       <p className="text-[9px] text-neutral-400 font-black uppercase tracking-[0.2em]">{new Date(act.timestamp?.toDate()).toLocaleString()}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </section>

             {/* System Status */}
             <section className="glass-card p-10 rounded-[3rem] space-y-10">
                <h3 className="text-3xl font-black dark:text-white flex items-center gap-4">
                  <Server className="w-7 h-7 text-cyan-500" /> Infrastructure
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-8 bg-green-500/5 border border-green-500/20 rounded-[2.5rem] space-y-2">
                    <p className="micro-label text-green-500">API Latency</p>
                    <p className="text-2xl font-black dark:text-white">12ms <span className="text-xs text-neutral-400 font-medium">Optimal</span></p>
                  </div>
                  <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-[2.5rem] space-y-2">
                    <p className="micro-label text-blue-500">Drive Sync</p>
                    <p className="text-2xl font-black dark:text-white">Active <span className="text-xs text-neutral-400 font-medium">Synced</span></p>
                  </div>
                </div>
                <div className="p-8 bg-neutral-50 dark:bg-white/5 rounded-[2.5rem] border border-neutral-100 dark:border-white/5">
                  <div className="flex justify-between items-center mb-6">
                    <p className="micro-label text-neutral-400">Resource Load</p>
                    <span className="text-[10px] font-black text-indigo-500">24.5 GB / 100 GB</span>
                  </div>
                  <div className="h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '45%' }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500" 
                    />
                  </div>
                </div>
             </section>
          </div>
        </div>
      )}

      {/* Events Registry Tab */}
      {activeTab === 'events' && (
        <section className="glass-card rounded-[3rem] overflow-hidden">
          <div className="p-10 flex justify-between items-center border-b border-neutral-100 dark:border-white/5">
             <h2 className="text-3xl font-black tracking-tight dark:text-white">Event Cluster</h2>
             <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input type="text" placeholder="Scan registry..." className="pl-14 pr-8 py-4 bg-neutral-50 dark:bg-white/5 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all w-80" />
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 dark:bg-white/5">
                <tr>
                  <th className="px-10 py-6 micro-label text-neutral-400">Resource Name</th>
                  <th className="px-10 py-6 micro-label text-neutral-400">Endpoint Owner</th>
                  <th className="px-10 py-6 micro-label text-neutral-400">Asset Load</th>
                  <th className="px-10 py-6 micro-label text-neutral-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {events.map(event => (
                  <tr key={event.id} className="group hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-10 py-8 font-black dark:text-white">{event.name}</td>
                    <td className="px-10 py-8 text-xs font-bold text-neutral-400">{event.photographerEmail || event.createdBy}</td>
                    <td className="px-10 py-8"><span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg font-black text-[10px] uppercase tracking-widest">{event.fileCount || 0} Assets</span></td>
                    <td className="px-10 py-8 text-right">
                      <button onClick={() => handleDeleteEvent(event.id)} className="p-3 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
