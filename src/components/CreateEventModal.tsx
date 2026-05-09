import React, { useState } from 'react';
import { X, Calendar, MapPin, Type, FileText, Globe, Lock, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firestoreService } from '../lib/firestoreService';
import { driveService } from '../lib/driveService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateEventModal({ isOpen, onClose }: CreateEventModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    isPublic: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Create Folder in Google Drive
      toast.loading('Provisioning Google Drive space...', { id: 'create-event' });
      const folder = await driveService.createFolder(formData.name);
      
      // 2. Save to Firestore
      toast.loading('Initializing event database...', { id: 'create-event' });
      const eventData = {
        ...formData,
        createdBy: user.uid,
        photographerName: user.displayName,
        photographerEmail: user.email,
        driveFolderId: folder.id,
        driveFolderLink: folder.webViewLink,
        fileCount: 0,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await firestoreService.createEvent(eventData);
      
      // 3. Record Activity
      await firestoreService.recordActivity({
        userId: user.uid,
        type: 'event_creation',
        description: `Created new event: ${formData.name}`,
        eventId: docRef.id
      });

      toast.success('Event live and ready!', { id: 'create-event' });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          name: '',
          date: new Date().toISOString().split('T')[0],
          location: '',
          description: '',
          isPublic: true
        });
      }, 2000);
    } catch (error: any) {
      console.error('Event creation error:', error);
      toast.error(error.message || 'Failed to create event', { id: 'create-event' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={!loading ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className="p-20 flex flex-col items-center justify-center text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/20"
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black dark:text-white tracking-tighter">Event Created!</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 font-medium">Redirecting to your dashboard...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500 rounded-2xl">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black dark:text-white tracking-tighter">New Production</h3>
                      <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-0.5">Start a new photo event</p>
                    </div>
                  </div>
                  <button onClick={onClose} disabled={loading} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                        <Type className="w-3.5 h-3.5" /> Event Name
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Summer Wedding 2024"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border-2 border-transparent focus:border-orange-500 outline-none transition-all dark:text-white font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> Date
                        </label>
                        <input
                          required
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border-2 border-transparent focus:border-orange-500 outline-none transition-all dark:text-white font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" /> Location
                        </label>
                        <input
                          type="text"
                          placeholder="Venue/City"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border-2 border-transparent focus:border-orange-500 outline-none transition-all dark:text-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Description
                      </label>
                      <textarea
                        placeholder="Add some details about the event..."
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border-2 border-transparent focus:border-orange-500 outline-none transition-all dark:text-white font-bold resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem]">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${formData.isPublic ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                        {formData.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-black dark:text-white">{formData.isPublic ? 'Public Gallery' : 'Private'}</p>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Visibility</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                      className={`w-12 h-6 rounded-full transition-all relative ${formData.isPublic ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isPublic ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-5 text-lg shadow-2xl disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Sparkles className="w-6 h-6" />
                    )}
                    {loading ? 'Creating Production...' : 'Create Production'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
