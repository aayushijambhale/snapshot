import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, Trash2, Shield, Globe, Lock, Settings, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function EventSettings() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.createdBy !== user?.uid) {
          toast.error('Only the event creator can access settings');
          navigate(`/event/${eventId}`);
          return;
        }
        setEvent({ id: docSnap.id, ...data });
        setName(data.name);
        setDate(data.date || '');
        setLocation(data.location || '');
        setIsPublic(data.isPublic !== false);
      } else {
        toast.error('Event not found');
        navigate('/');
      }
      setLoading(false);
    };

    fetchEvent();
  }, [eventId, user, navigate]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Event name is required');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'events', eventId!), {
        name: name.trim(),
        date,
        location,
        isPublic,
        updatedAt: new Date().toISOString()
      });
      toast.success('Settings updated');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'events', eventId!));
      toast.success('Event deleted');
      navigate('/');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete event');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 px-4 sm:px-6">
      <div className="space-y-4">
        <Link to={`/event/${eventId}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-orange-500 transition-all">
          <ArrowLeft className="w-4 h-4" /> Back to Gallery
        </Link>
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter dark:text-white">Event <span className="gradient-text">Settings.</span></h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 font-medium tracking-tight">Manage your gallery details and privacy.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section className="premium-card p-10 space-y-8">
            <div className="flex items-center gap-4 border-b border-neutral-50 dark:border-neutral-800 pb-6">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
                <Shield className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-black dark:text-white tracking-tight">General Information</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Basic Event Details</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Event Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter event name"
                  className="w-full px-8 py-5 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-800 rounded-[2rem] transition-all outline-none font-bold text-lg dark:text-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Event Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-8 py-5 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-800 rounded-[2rem] transition-all outline-none font-bold dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location"
                    className="w-full px-8 py-5 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-800 rounded-[2rem] transition-all outline-none font-bold dark:text-white"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="premium-card p-10 space-y-8">
            <div className="flex items-center gap-4 border-b border-neutral-50 dark:border-neutral-800 pb-6">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
                <Globe className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-black dark:text-white tracking-tight">Privacy & Visibility</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Control who can see your moments</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                onClick={() => setIsPublic(true)}
                className={`p-8 rounded-[2.5rem] border-2 transition-all text-left space-y-4 group relative overflow-hidden ${
                  isPublic ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-200 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className={`p-3 rounded-2xl ${isPublic ? 'bg-orange-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                    <Globe className="w-6 h-6" />
                  </div>
                  {isPublic && (
                    <motion.div layoutId="active-check" className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </div>
                <div className="relative z-10">
                  <p className="text-lg font-black dark:text-white">Public Gallery</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">Anyone with the link or QR code can view and upload photos.</p>
                </div>
              </button>

              <button
                onClick={() => setIsPublic(false)}
                className={`p-8 rounded-[2.5rem] border-2 transition-all text-left space-y-4 group relative overflow-hidden ${
                  !isPublic ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-200 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className={`p-3 rounded-2xl ${!isPublic ? 'bg-orange-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                    <Lock className="w-6 h-6" />
                  </div>
                  {!isPublic && (
                    <motion.div layoutId="active-check" className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </div>
                <div className="relative z-10">
                  <p className="text-lg font-black dark:text-white">Private Gallery</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">Only you can view and manage this gallery. (Invite only coming soon)</p>
                </div>
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="premium-card p-8 space-y-6">
            <h3 className="text-lg font-black dark:text-white tracking-tight">Quick Actions</h3>
            <div className="space-y-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-lg hover:shadow-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                Save Changes
              </button>
            </div>
          </section>

          <section className="premium-card p-8 border-red-100 dark:border-red-900/20 bg-red-50/30 dark:bg-red-900/5 space-y-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-lg font-black tracking-tight">Danger Zone</h3>
            </div>
            <p className="text-xs text-red-700/70 dark:text-red-500/70 font-medium leading-relaxed">
              Deleting this event will permanently remove all photos and data. This action is irreversible.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 bg-red-500 text-white rounded-[2rem] font-black hover:bg-red-600 transition-all shadow-xl shadow-red-200 dark:shadow-none active:scale-95"
            >
              Delete Event
            </button>
          </section>
        </div>
      </div>

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
                <h3 className="text-3xl font-black dark:text-white tracking-tighter leading-none">Are you sure?</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium tracking-tight">This will permanently remove the gallery and all its photos. This action cannot be undone.</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-3xl font-black hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={deleting}
                  className="flex-1 py-5 bg-red-500 text-white rounded-3xl font-black hover:bg-red-600 transition-all shadow-xl shadow-red-200 dark:shadow-none disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
