import React, { useState, useEffect, Component } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, collectionGroup, getCountFromServer, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Camera, Search, User, ArrowRight, Grid, Clock, Sparkles, Loader2, Plus, Download, Filter, Calendar, Settings, RefreshCw, MapPin, Activity, LogOut, Image, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        if (this.state.error?.message) {
          const info = JSON.parse(this.state.error.message);
          if (info.error.includes('permissions')) {
            message = "You don't have permission to access this data. Please contact an administrator.";
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-full">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black dark:text-white tracking-tighter">Application Error</h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">{message}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-200 dark:shadow-none hover:bg-orange-600 transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
        const eventsPath = 'events';
        let eventsData: any[] = [];
        try {
          const eventsQuery = query(
            collection(db, eventsPath),
            where('createdBy', '==', user.uid)
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRecentEvents(eventsData.slice(0, 3));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, eventsPath);
        }

        // 2. Real Stats
        // Total Events
        const totalEvents = eventsData.length;

        // Photos Shared (Photos uploaded by this user across ALL events)
        const photosPath = 'photos (collectionGroup)';
        let photosShared = 0;
        try {
          const photosQuery = query(
            collectionGroup(db, 'photos'),
            where('uploadedBy', '==', user.uid)
          );
          const photosCountSnapshot = await getCountFromServer(photosQuery);
          photosShared = photosCountSnapshot.data().count;
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, photosPath);
        }

        // Fetch User Stats (Downloads and AI Matches)
        const userStatsPath = `user_stats/${user.uid}`;
        let userStatsData = { totalDownloads: 0, totalAiMatches: 0 };
        try {
          const userStatsDoc = await getDoc(doc(db, 'user_stats', user.uid));
          userStatsData = userStatsDoc.exists() ? userStatsDoc.data() as any : { totalDownloads: 0, totalAiMatches: 0 };
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, userStatsPath);
        }
        
        // 3. Fetch Recent Activity
        const activityPath = 'activity';
        try {
          const activityQuery = query(
            collection(db, activityPath),
            where('userId', '==', user.uid),
            limit(5)
          );
          const activitySnapshot = await getDocs(activityQuery);
          setRecentActivity(activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, activityPath);
        }

        setStats({
          totalEvents,
          photosShared,
          aiMatches: userStatsData.totalAiMatches || 0,
          downloads: userStatsData.totalDownloads || 0
        });

      } catch (error) {
        console.error('Fetch dashboard error:', error);
        // Re-throw if it's already a FirestoreErrorInfo JSON, otherwise toast
        try {
          JSON.parse((error as Error).message);
          throw error;
        } catch (e) {
          toast.error('Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto space-y-10 pb-32 px-4 sm:px-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase tracking-widest"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Control Center
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tighter dark:text-white"
          >
            Your <span className="gradient-text">Insights.</span>
          </motion.h1>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2.5 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700"
        >
          <div className="px-3.5 py-1.5 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 text-xs font-bold dark:text-white flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            System Live
          </div>
          <button className="p-1.5 hover:bg-white dark:hover:bg-neutral-900 rounded-xl transition-all text-neutral-500">
            <Settings className="w-4.5 h-4.5" />
          </button>
        </motion.div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Events', value: stats.totalEvents, icon: Calendar, color: 'bg-orange-500' },
          { label: 'Photos Shared', value: stats.photosShared, icon: Camera, color: 'bg-blue-500' },
          { label: 'AI Matches', value: stats.aiMatches, icon: Sparkles, color: 'bg-purple-500' },
          { label: 'Downloads', value: stats.downloads, icon: Download, color: 'bg-green-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="premium-card p-6 group relative overflow-hidden"
          >
            <div className="relative z-10 space-y-3">
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg shadow-${stat.color.split('-')[1]}-200 dark:shadow-none transition-transform group-hover:scale-110`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-3xl font-black dark:text-white">
                  {loading ? (
                    <div className="h-8 w-16 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-lg" />
                  ) : (
                    stat.value
                  )}
                </h3>
              </div>
            </div>
            <div className={`absolute -bottom-6 -right-6 w-20 h-20 ${stat.color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Events */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black dark:text-white">Recent Galleries</h2>
            <Link to="/" className="text-xs font-black text-orange-500 hover:underline">View All</Link>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
              ))
            ) : recentEvents.length > 0 ? (
              recentEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass p-5 rounded-2xl flex items-center justify-between group hover:border-orange-500/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-7 h-7 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="text-base font-black dark:text-white group-hover:text-orange-500 transition-colors">{event.name}</h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location || 'Remote'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex -space-x-2.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-neutral-900 bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                          <img 
                            src={`https://picsum.photos/seed/${event.id + i}/100`} 
                            alt="" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ))}
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-10 text-center glass rounded-2xl border-2 border-dashed border-neutral-100 dark:border-neutral-800">
                <p className="text-neutral-400 font-bold text-sm">No events yet. Start by creating one!</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black dark:text-white">Activity</h2>
            <button className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all">
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </div>

          <div className="glass p-6 rounded-[2rem] space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Activity className="w-20 h-20" />
            </div>
            
            <div className="space-y-5 relative z-10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                ))
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3.5"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-500">
                        {activity.type === 'upload' ? <Image className="w-4.5 h-4.5" /> : 
                         activity.type === 'match' ? <Sparkles className="w-4.5 h-4.5" /> : 
                         <Calendar className="w-4.5 h-4.5" />}
                      </div>
                      {i !== recentActivity.length - 1 && (
                        <div className="absolute top-9 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-neutral-100 dark:bg-neutral-800" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold dark:text-neutral-200 leading-tight">{activity.description}</p>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                        {activity.timestamp?.toDate ? new Date(activity.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-neutral-400 font-bold">No recent activity</p>
                </div>
              )}
            </div>
            
            <button className="w-full py-3.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all">
              View Full History
            </button>
          </div>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
