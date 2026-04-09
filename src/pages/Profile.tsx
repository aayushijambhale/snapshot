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
    <div className="max-w-6xl mx-auto space-y-12 pb-32 px-4 sm:px-6">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative h-56 sm:h-64 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-[2.5rem] overflow-hidden shadow-2xl group"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        
        <div className="absolute -bottom-12 left-6 sm:left-12 flex items-end gap-6">
          <div className="relative group/avatar">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || ''} 
                referrerPolicy="no-referrer"
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl border-[8px] border-white dark:border-neutral-900 shadow-2xl object-cover transition-transform duration-500 group-hover/avatar:scale-105"
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl border-[8px] border-white dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-2xl">
                <User className="w-16 h-16 text-neutral-300 dark:text-neutral-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer backdrop-blur-sm">
              <div className="p-3 bg-white/20 rounded-xl border border-white/30">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="pb-16 space-y-1">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-2xl"
            >
              {user.displayName || 'Anonymous User'}
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2"
            >
              <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-bold text-white">{user.email}</span>
              </div>
              <div className="px-3 py-1 bg-green-500/80 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Verified</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-12">
        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="premium-card p-8 space-y-8">
            <div className="space-y-1">
              <h3 className="font-black text-xl flex items-center gap-2.5 dark:text-white tracking-tight">
                <Shield className="w-6 h-6 text-orange-500" />
                Account Security
              </h3>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Manage your personal information</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                  <UserCheck className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Unique ID</p>
                  <p className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400 truncate max-w-[150px]">{user.uid}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                  <Calendar className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Joining Date</p>
                  <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-neutral-50 dark:border-neutral-800 space-y-3">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all active:scale-95 shadow-sm"
              >
                <Settings className="w-4 h-4" /> Edit Profile
              </button>
              <button
                onClick={logout}
                className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95 shadow-sm"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
          
          <div className="p-6 bg-black dark:bg-white rounded-[2rem] shadow-2xl flex items-center justify-between group cursor-pointer overflow-hidden relative">
            <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative z-10">
              <p className="text-white/60 dark:text-black/60 text-[9px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Need Help?</p>
              <p className="text-white dark:text-black font-black text-lg tracking-tight group-hover:text-white transition-colors">Contact Support</p>
            </div>
            <div className="relative z-10 p-2.5 bg-white/10 dark:bg-black/10 rounded-xl group-hover:bg-white/20 transition-colors">
              <ArrowRight className="w-5 h-5 text-white dark:text-black group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {/* Main Content: My Events */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h3 className="font-black text-2xl flex items-center gap-3 dark:text-white tracking-tight">
                <Grid className="w-6 h-6 text-orange-500" />
                My Collections
              </h3>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Events you've created and managed</p>
            </div>
            <Link 
              to="/" 
              className="px-5 py-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all flex items-center gap-2 shadow-sm"
            >
              New Event <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 h-48 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : myEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {myEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group premium-card p-6 hover:shadow-2xl transition-all border border-neutral-100 dark:border-neutral-800"
                  >
                    <div className="space-y-5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                          <h4 className="text-xl font-black tracking-tight group-hover:text-orange-500 transition-colors dark:text-white leading-tight">
                            {event.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">
                              {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${
                          event.isPublic !== false 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-100 dark:border-green-900/20' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/20'
                        }`}>
                          {event.isPublic !== false ? 'Public' : 'Private'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-5 border-t border-neutral-50 dark:border-neutral-800">
                        <Link
                          to={`/event/${event.id}`}
                          className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-xl"
                        >
                          View Gallery
                        </Link>
                        <Link
                          to={`/event/${event.id}/settings`}
                          className="p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all shadow-sm"
                        >
                          <Settings className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-24 text-center space-y-8 glass rounded-[3rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800 shadow-inner">
              <div className="p-8 bg-neutral-50 dark:bg-neutral-800 w-fit mx-auto rounded-full shadow-sm">
                <Grid className="w-16 h-16 text-neutral-200 dark:text-neutral-700" />
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-black text-neutral-500 dark:text-neutral-400 tracking-tighter">No events created</p>
                <p className="text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto text-base font-medium">
                  You haven't created any events yet. Start by creating your first photo gallery!
                </p>
              </div>
              <Link
                to="/"
                className="inline-block px-10 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-2xl shadow-orange-200 dark:shadow-none active:scale-95"
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
              className="bg-white dark:bg-neutral-900 p-10 rounded-[2.5rem] max-w-md w-full space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.3)] border border-neutral-100 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2 text-center">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 w-fit mx-auto rounded-2xl mb-2">
                  <Settings className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-3xl font-black dark:text-white tracking-tighter">Edit Profile</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Update your public identity</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-3">Display Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-900 transition-all outline-none dark:text-white font-bold text-base"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  disabled={updating}
                  className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all shadow-2xl shadow-orange-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
