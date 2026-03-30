import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy } from '../lib/db';
import { db } from '../lib/db';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Grid, ArrowRight, LogOut, Settings, Shield, UserCheck, Loader2, Camera } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto space-y-12 pb-32">
      {/* Profile Header */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-orange-500 to-orange-600 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
        <div className="absolute -bottom-12 left-8 sm:left-12 flex items-end gap-6">
          <div className="relative group">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || ''} 
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] border-8 border-white shadow-2xl object-cover"
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] border-8 border-white bg-neutral-100 flex items-center justify-center shadow-2xl">
                <User className="w-16 h-16 text-neutral-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pb-4 space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              {user.displayName || 'Anonymous User'}
            </h1>
            <p className="text-white/80 font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" /> {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-xl space-y-8">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-500" />
              Account Details
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-neutral-50 rounded-2xl">
                  <UserCheck className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">User ID</p>
                  <p className="text-sm font-mono text-neutral-600 truncate max-w-[150px]">{user.uid}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-neutral-50 rounded-2xl">
                  <Calendar className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Member Since</p>
                  <p className="text-sm font-medium text-neutral-600">
                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-neutral-50 space-y-3">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all"
              >
                <Settings className="w-5 h-5" /> Edit Profile
              </button>
              <button
                onClick={logout}
                className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
              >
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content: My Events */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-2xl flex items-center gap-3">
              <Grid className="w-7 h-7 text-orange-500" />
              My Events
            </h3>
            <Link 
              to="/" 
              className="text-orange-500 font-bold text-sm hover:underline flex items-center gap-1"
            >
              Create New <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            </div>
          ) : myEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AnimatePresence>
                {myEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-lg hover:shadow-2xl transition-all"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="text-xl font-bold tracking-tight group-hover:text-orange-500 transition-colors">
                            {event.name}
                          </h4>
                          <p className="text-xs text-neutral-400">
                            Created {new Date(event.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          event.isPublic !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {event.isPublic !== false ? 'Public' : 'Private'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                        <Link
                          to={`/event/${event.id}`}
                          className="px-6 py-2 bg-neutral-50 text-neutral-600 rounded-xl text-sm font-bold hover:bg-neutral-100 transition-all flex items-center gap-2"
                        >
                          View Gallery
                        </Link>
                        <Link
                          to={`/event/${event.id}/settings`}
                          className="p-2 text-neutral-400 hover:text-orange-500 transition-colors"
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
            <div className="py-24 text-center space-y-6 bg-white rounded-[4rem] border-2 border-dashed border-neutral-100">
              <div className="p-8 bg-neutral-50 w-fit mx-auto rounded-full">
                <Grid className="w-16 h-16 text-neutral-200" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-neutral-500 tracking-tight">No events created</p>
                <p className="text-neutral-400 max-w-xs mx-auto text-lg">
                  You haven't created any events yet. Start by creating your first photo gallery!
                </p>
              </div>
              <Link
                to="/"
                className="inline-block px-10 py-4 bg-black text-white rounded-full font-bold hover:bg-neutral-800 transition-all shadow-xl active:scale-95"
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
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-[3rem] max-w-sm w-full space-y-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-bold">Edit Profile</h3>
                <p className="text-neutral-500">Update your public information</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Display Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-full font-bold hover:bg-neutral-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  disabled={updating}
                  className="flex-1 py-4 bg-black text-white rounded-full font-bold hover:bg-neutral-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
