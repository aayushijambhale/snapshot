import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Grid, ArrowRight, LogOut, Settings, Shield, UserCheck, Loader2, Camera, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchMyEvents = async () => {
      try {
        const q = query(
          collection(db, 'events'),
          where('createdBy', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setMyEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Fetch events error:', error);
        toast.error('Failed to load your events');
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [user, navigate]);

  const handleUpdateProfile = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setUpdating(true);
    try {
      await updateProfile(newName.trim());
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32 px-4 sm:px-6">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative h-64 sm:h-80 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-[4rem] overflow-hidden shadow-2xl group"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        
        <div className="absolute -bottom-16 left-8 sm:left-16 flex items-end gap-8">
          <div className="relative group/avatar">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || ''} 
                referrerPolicy="no-referrer"
                className="w-40 h-40 sm:w-52 sm:h-52 rounded-[3.5rem] border-[12px] border-white dark:border-neutral-900 shadow-2xl object-cover transition-transform duration-500 group-hover/avatar:scale-105"
              />
            ) : (
              <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-[3.5rem] border-[12px] border-white dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-2xl">
                <User className="w-20 h-20 text-neutral-300 dark:text-neutral-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-[3.5rem] opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer backdrop-blur-sm">
              <div className="p-4 bg-white/20 rounded-2xl border border-white/30">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          <div className="pb-20 space-y-2">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-2xl"
            >
              {user.displayName || 'Anonymous User'}
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3"
            >
              <div className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-2">
                <Mail className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">{user.email}</span>
              </div>
              <div className="px-4 py-1.5 bg-green-500/80 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Verified</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-16">
        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="premium-card p-10 space-y-10">
            <div className="space-y-2">
              <h3 className="font-black text-2xl flex items-center gap-3 dark:text-white tracking-tight">
                <Shield className="w-8 h-8 text-orange-500" />
                Account Security
              </h3>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 font-medium">Manage your personal information</p>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-center gap-5 group">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-3xl group-hover:scale-110 transition-transform shadow-sm">
                  <UserCheck className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Unique ID</p>
                  <p className="text-sm font-mono font-bold text-neutral-600 dark:text-neutral-400 truncate max-w-[180px]">{user.uid}</p>
                </div>
              </div>

              <div className="flex items-center gap-5 group">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-3xl group-hover:scale-110 transition-transform shadow-sm">
                  <Calendar className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Joining Date</p>
                  <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-neutral-50 dark:border-neutral-800 space-y-4">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all active:scale-95 shadow-sm"
              >
                <Settings className="w-5 h-5" /> Edit Profile
              </button>
              <button
                onClick={logout}
                className="w-full py-5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95 shadow-sm"
              >
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </div>
          </div>
          
          <div className="p-8 bg-black dark:bg-white rounded-[3rem] shadow-2xl flex items-center justify-between group cursor-pointer overflow-hidden relative">
            <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative z-10">
              <p className="text-white/60 dark:text-black/60 text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Need Help?</p>
              <p className="text-white dark:text-black font-black text-xl tracking-tight group-hover:text-white transition-colors">Contact Support</p>
            </div>
            <div className="relative z-10 p-3 bg-white/10 dark:bg-black/10 rounded-2xl group-hover:bg-white/20 transition-colors">
              <ArrowRight className="w-6 h-6 text-white dark:text-black group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {/* Main Content: My Events */}
        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h3 className="font-black text-3xl flex items-center gap-4 dark:text-white tracking-tight">
                <Grid className="w-8 h-8 text-orange-500" />
                My Collections
              </h3>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 font-medium">Events you've created and managed</p>
            </div>
            <Link 
              to="/" 
              className="px-6 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all flex items-center gap-2 shadow-sm"
            >
              New Event <Plus className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 p-8 rounded-[3.5rem] border border-neutral-100 dark:border-neutral-800 h-56 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : myEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <AnimatePresence mode="popLayout">
                {myEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group premium-card p-8 hover:shadow-2xl transition-all border border-neutral-100 dark:border-neutral-800"
                  >
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="text-2xl font-black tracking-tight group-hover:text-orange-500 transition-colors dark:text-white leading-tight">
                            {event.name}
                          </h4>
                          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                          event.isPublic !== false 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-100 dark:border-green-900/20' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/20'
                        }`}>
                          {event.isPublic !== false ? 'Public' : 'Private'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-6 border-t border-neutral-50 dark:border-neutral-800">
                        <Link
                          to={`/event/${event.id}`}
                          className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-xl"
                        >
                          View Gallery
                        </Link>
                        <Link
                          to={`/event/${event.id}/settings`}
                          className="p-4 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-2xl transition-all shadow-sm"
                        >
                          <Settings className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-32 text-center space-y-10 glass rounded-[4rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800 shadow-inner">
              <div className="p-10 bg-neutral-50 dark:bg-neutral-800 w-fit mx-auto rounded-full shadow-sm">
                <Grid className="w-20 h-20 text-neutral-200 dark:text-neutral-700" />
              </div>
              <div className="space-y-3">
                <p className="text-4xl font-black text-neutral-500 dark:text-neutral-400 tracking-tighter">No events created</p>
                <p className="text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto text-lg font-medium">
                  You haven't created any events yet. Start by creating your first photo gallery!
                </p>
              </div>
              <Link
                to="/"
                className="inline-block px-12 py-5 bg-orange-500 text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-orange-600 transition-all shadow-2xl shadow-orange-200 dark:shadow-none active:scale-95"
              >
                Create Event
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              className="bg-white dark:bg-neutral-900 p-12 rounded-[4rem] max-w-md w-full space-y-10 shadow-[0_0_100px_rgba(0,0,0,0.3)] border border-neutral-100 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3 text-center">
                <div className="p-5 bg-orange-50 dark:bg-orange-900/20 w-fit mx-auto rounded-[2rem] mb-4">
                  <Settings className="w-10 h-10 text-orange-500" />
                </div>
                <h3 className="text-4xl font-black dark:text-white tracking-tighter">Edit Profile</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">Update your public identity</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Display Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-8 py-5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-100 dark:border-neutral-700 rounded-[2rem] focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-900 transition-all outline-none dark:text-white font-bold text-lg"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  disabled={updating}
                  className="flex-1 py-5 bg-orange-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-2xl shadow-orange-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
