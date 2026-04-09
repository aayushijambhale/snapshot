import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, ArrowRight, QrCode, Trash2, Sparkles, Shield, Zap, Users, Camera as CameraIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function Home() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventLocation, setEventLocation] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingEvents(false);
    });
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to create an event');
      login();
      return;
    }
    if (!eventName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'events'), {
        name: eventName,
        date: eventDate,
        location: eventLocation,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        creatorName: user.displayName,
      });

      // Record activity
      await addDoc(collection(db, 'activity'), {
        userId: user.uid,
        type: 'create_event',
        description: `Created event "${eventName}"`,
        timestamp: serverTimestamp(),
        eventId: docRef.id
      });

      toast.success('Event created successfully!');
      setEventName('');
      setIsCreating(false);
      navigate(`/event/${docRef.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{id: string, createdBy: string} | null>(null);

  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string, createdBy: string) => {
    e.stopPropagation();
    if (user?.uid !== createdBy) {
      toast.error('Only the creator can delete this event');
      return;
    }
    setEventToDelete({ id: eventId, createdBy });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteDoc(doc(db, 'events', eventToDelete.id));
      toast.success('Event deleted');
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete event');
    }
  };

  return (
    <div className="space-y-24 pb-32">
      {/* Hero Section - Editorial Style */}
      <section className="relative min-h-[80vh] flex flex-col justify-center overflow-hidden pt-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[600px] bg-gradient-to-b from-orange-500/10 via-rose-500/5 to-transparent blur-[120px] -z-10" />
        
        <div className="container mx-auto px-4 sm:px-6">
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="h-[1px] w-8 bg-orange-500" />
              <span className="micro-label text-orange-500">The Future of Event Photography</span>
            </motion.div>
            
            <div className="relative">
              <motion.h1 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="editorial-title dark:text-white"
              >
                Capture <br />
                <span className="gradient-text">Everything.</span>
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: -6 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="absolute -top-8 right-0 hidden lg:flex flex-col items-center gap-2 p-4 bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-700"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest dark:text-white">AI Powered</span>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-5 space-y-6"
              >
                <p className="text-xl text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                  SnapSearch uses cutting-edge AI to instantly organize your event photos and help guests find themselves in seconds.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {!isCreating ? (
                    <button
                      onClick={() => setIsCreating(true)}
                      className="px-8 py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      Create Event
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-8 py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-black text-lg hover:bg-neutral-200 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button className="px-8 py-5 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl font-black text-lg hover:bg-neutral-50 transition-all dark:text-white">
                    View Demo
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-7"
              >
                <AnimatePresence mode="wait">
                  {isCreating && (
                    <motion.form 
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      onSubmit={handleCreateEvent} 
                      className="glass p-8 rounded-[2.5rem] shadow-2xl border border-white/20 space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="micro-label ml-3">Event Name</label>
                          <input
                            autoFocus
                            type="text"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="e.g. Summer Gala 2024"
                            className="w-full px-6 py-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-800 dark:text-white focus:border-orange-500 outline-none transition-all text-lg font-black"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="micro-label ml-3">Date</label>
                            <input
                              type="date"
                              value={eventDate}
                              onChange={(e) => setEventDate(e.target.value)}
                              className="w-full px-6 py-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-800 dark:text-white focus:border-orange-500 outline-none transition-all font-black"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="micro-label ml-3">Location</label>
                            <input
                              type="text"
                              value={eventLocation}
                              onChange={(e) => setEventLocation(e.target.value)}
                              placeholder="e.g. San Francisco"
                              className="w-full px-6 py-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-800 dark:text-white focus:border-orange-500 outline-none transition-all font-black"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 dark:shadow-none uppercase tracking-widest"
                      >
                        Launch Event Gallery
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="container mx-auto px-4 sm:px-6 space-y-12">
        <div className="space-y-3 text-center">
          <span className="micro-label text-orange-500">Why SnapSearch?</span>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter dark:text-white">Built for the <br /> <span className="gradient-text">Modern Event.</span></h2>
        </div>

        <div className="bento-grid">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item md:col-span-8 min-h-[350px] bg-neutral-900 text-white border-none"
          >
            <div className="space-y-5 relative z-10">
              <div className="p-3 bg-orange-500 w-fit rounded-xl shadow-lg shadow-orange-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tighter">AI Face Recognition</h3>
                <p className="text-lg text-neutral-400 font-medium max-w-md">Guests just take a selfie and our AI finds every photo they're in. No more scrolling through thousands of images.</p>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px]" />
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item md:col-span-4 bg-white dark:bg-neutral-900"
          >
            <div className="space-y-5">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter dark:text-white">Instant Sharing</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">Generate a QR code and let guests upload and view photos in real-time.</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item md:col-span-4 bg-white dark:bg-neutral-900"
          >
            <div className="space-y-5">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter dark:text-white">Privacy First</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">Advanced face blurring and privacy controls for sensitive events.</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item md:col-span-8 bg-gradient-to-br from-purple-600 to-rose-600 text-white border-none"
          >
            <div className="space-y-5 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md w-fit rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tighter">Community Driven</h3>
                <p className="text-lg text-white/80 font-medium max-w-md">Likes, comments, and engagement metrics for every moment captured.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Events Section */}
      <section className="container mx-auto px-4 sm:px-6 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 text-left">
            <span className="micro-label text-orange-500">The Gallery</span>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter dark:text-white">Live <br /> <span className="gradient-text">Galleries.</span></h2>
          </div>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 font-medium max-w-sm leading-relaxed">
            Join thousands of people sharing their best moments in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingEvents ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[380px] bg-neutral-100 dark:bg-neutral-800 rounded-3xl animate-pulse" />
            ))
          ) : events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="premium-card group h-[380px] p-8 cursor-pointer relative overflow-hidden flex flex-col justify-between"
              onClick={() => navigate(`/event/${event.id}`)}
            >
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl group-hover:scale-110 transition-all duration-500 shadow-lg shadow-orange-100 dark:shadow-none group-hover:rotate-6">
                    <QrCode className="w-8 h-8 text-orange-500" />
                  </div>
                  {user?.uid === event.createdBy && (
                    <button
                      onClick={(e) => handleDeleteEvent(e, event.id, event.createdBy)}
                      className="p-3 text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-3xl font-black group-hover:text-orange-500 transition-colors dark:text-white leading-[0.95] tracking-tighter">
                    {event.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <CalendarIcon className="w-3 h-3" />
                      {event.date || 'TBA'}
                    </div>
                    {event.location && (
                      <div className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-orange-200 dark:shadow-none">
                    {event.creatorName?.charAt(0) || 'A'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black dark:text-white">{event.creatorName?.split(' ')[0] || 'Anonymous'}</span>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Organizer</span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black dark:bg-white text-white dark:text-black group-hover:scale-110 transition-all duration-500 shadow-xl">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
              
              {/* Decorative background element */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] group-hover:bg-orange-500/10 transition-colors duration-700" />
            </motion.div>
          ))}
          
          {!loadingEvents && events.length === 0 && (
            <div className="col-span-full py-32 text-center space-y-8 glass rounded-[5rem] border-4 border-dashed border-neutral-100 dark:border-neutral-800">
              <div className="p-10 bg-neutral-50 dark:bg-neutral-800 w-fit mx-auto rounded-full">
                <CameraIcon className="w-20 h-20 text-neutral-200 dark:text-neutral-700" />
              </div>
              <div className="space-y-4">
                <p className="text-4xl font-black text-neutral-400 dark:text-neutral-500 tracking-tighter">No active galleries</p>
                <p className="text-xl text-neutral-400 dark:text-neutral-500 font-medium">Be the first to create a shared memory space.</p>
              </div>
            </div>
          )}
        </div>
      </section>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 p-10 rounded-[3rem] max-w-sm w-full text-center space-y-8 shadow-2xl border border-neutral-100 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-red-50 dark:bg-red-900/20 w-fit mx-auto rounded-full">
                <Trash2 className="w-12 h-12 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black dark:text-white tracking-tighter">Delete Event?</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">This will permanently remove the gallery and all its photos. This action cannot be undone.</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-3xl font-black hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-5 bg-red-500 text-white rounded-3xl font-black hover:bg-red-600 transition-all shadow-xl shadow-red-200 dark:shadow-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
