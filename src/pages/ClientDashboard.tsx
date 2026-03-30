import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, collectionGroup, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Camera, Search, User, ArrowRight, Grid, Clock, Sparkles, Loader2, Plus, Download, Filter, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    photosShared: 0,
    aiMatches: 0,
    downloads: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        // 1. Fetch events created by user
        const eventsQuery = query(
          collection(db, 'events'),
          where('createdBy', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentEvents(eventsData.slice(0, 3));

        // 2. Real Stats
        // Total Events
        const totalEvents = eventsData.length;

        // Photos Shared (Photos uploaded by this user across ALL events)
        const photosQuery = query(
          collectionGroup(db, 'photos'),
          where('uploadedBy', '==', user.uid)
        );
        const photosCountSnapshot = await getCountFromServer(photosQuery);
        const photosShared = photosCountSnapshot.data().count;

        // Fetch User Stats (Downloads and AI Matches)
        const userStatsDoc = await getDoc(doc(db, 'user_stats', user.uid));
        const userStatsData = userStatsDoc.exists() ? userStatsDoc.data() : { totalDownloads: 0, totalAiMatches: 0 };
        
        // 3. Fetch Recent Activity
        const activityQuery = query(
          collection(db, 'activity'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const activitySnapshot = await getDocs(activityQuery);
        setRecentActivity(activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        setStats({
          totalEvents,
          photosShared,
          aiMatches: userStatsData.totalAiMatches || 0,
          downloads: userStatsData.totalDownloads || 0
        });

      } catch (error) {
        console.error('Fetch dashboard error:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-10 h-10 text-orange-500" />
            Client Dashboard
          </h1>
          <p className="text-neutral-500 text-lg">Welcome back, {user.displayName?.split(' ')[0] || 'User'}. Here's what's happening.</p>
        </div>
        <Link
          to="/"
          className="px-8 py-4 bg-black text-white rounded-full font-bold hover:bg-neutral-800 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Create New Event
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Events', value: stats.totalEvents, icon: Grid, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Photos Shared', value: stats.photosShared, icon: Camera, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'AI Matches', value: stats.aiMatches, icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Downloads', value: stats.downloads, icon: Download, color: 'text-green-500', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-lg space-y-4"
          >
            <div className={`p-4 ${stat.bg} w-fit rounded-2xl`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-extrabold tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Recent Events */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-2xl flex items-center gap-3">
              <Clock className="w-7 h-7 text-orange-500" />
              Recent Events
            </h3>
            <Link to="/profile" className="text-orange-500 font-bold text-sm hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 bg-white rounded-[3rem] border border-neutral-100">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            </div>
          ) : recentEvents.length > 0 ? (
            <div className="space-y-4">
              {recentEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-lg hover:shadow-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center border border-neutral-100 group-hover:bg-orange-50 transition-colors">
                      <Camera className="w-8 h-8 text-neutral-300 group-hover:text-orange-500 transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold tracking-tight group-hover:text-orange-500 transition-colors">{event.name}</h4>
                      <p className="text-sm text-neutral-400 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> {new Date(event.createdAt).toLocaleDateString()}
                        <span className="mx-1">•</span>
                        <User className="w-3 h-3" /> {event.creatorName || 'You'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/event/${event.id}`}
                      className="px-6 py-3 bg-neutral-50 text-neutral-600 rounded-2xl text-sm font-bold hover:bg-neutral-100 transition-all flex items-center gap-2"
                    >
                      Gallery
                    </Link>
                    <Link
                      to={`/event/${event.id}/upload`}
                      className="p-3 bg-black text-white rounded-2xl hover:bg-neutral-800 transition-all shadow-lg active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center space-y-6 bg-white rounded-[3rem] border-2 border-dashed border-neutral-100">
              <p className="text-xl font-bold text-neutral-400">No recent events found</p>
              <Link to="/" className="inline-block px-8 py-3 bg-black text-white rounded-full font-bold">
                Create One Now
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions / Activity */}
        <div className="lg:col-span-4 space-y-8">
          <h3 className="font-bold text-2xl flex items-center gap-3">
            <Filter className="w-7 h-7 text-orange-500" />
            Activity Logs
          </h3>
          <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-xl space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-2xl hover:bg-neutral-50 transition-colors"
                >
                  <div className={`p-2 rounded-xl mt-1 ${
                    activity.type === 'download' ? 'bg-green-50 text-green-500' :
                    activity.type === 'match' ? 'bg-purple-50 text-purple-500' :
                    activity.type === 'upload' ? 'bg-orange-50 text-orange-500' :
                    'bg-blue-50 text-blue-500'
                  }`}>
                    {activity.type === 'download' ? <Download className="w-4 h-4" /> :
                     activity.type === 'match' ? <Sparkles className="w-4 h-4" /> :
                     activity.type === 'upload' ? <Camera className="w-4 h-4" /> :
                     <Calendar className="w-4 h-4" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold leading-tight">{activity.description}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      {activity.timestamp?.toDate ? new Date(activity.timestamp.toDate()).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center text-neutral-400 text-sm italic">
                No recent activity to show.
              </div>
            )}
          </div>

          <h3 className="font-bold text-2xl flex items-center gap-3 pt-4">
            <Sparkles className="w-7 h-7 text-orange-500" />
            Quick Actions
          </h3>
          <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-xl space-y-4">
            <button
              onClick={() => navigate('/profile')}
              className="w-full p-6 bg-neutral-50 rounded-3xl border border-neutral-100 hover:border-orange-200 hover:bg-orange-50 transition-all text-left flex items-center gap-4 group"
            >
              <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:text-orange-500 transition-colors">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">Manage Profile</p>
                <p className="text-xs text-neutral-400">View your account details</p>
              </div>
            </button>

            <button
              onClick={() => toast.info('AI Insights coming soon!')}
              className="w-full p-6 bg-neutral-50 rounded-3xl border border-neutral-100 hover:border-orange-200 hover:bg-orange-50 transition-all text-left flex items-center gap-4 group"
            >
              <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:text-orange-500 transition-colors">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">Global Search</p>
                <p className="text-xs text-neutral-400">Find yourself across all events</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
