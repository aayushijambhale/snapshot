import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-end p-4 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="w-full max-w-sm h-full bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-2xl font-black dark:text-white tracking-tighter">Your Profile</h3>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all">
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-orange-500 shadow-xl">
                  <img src={user.photoURL || ''} className="w-full h-full object-cover" alt="Profile" />
                </div>
                <div>
                  <p className="text-xl font-black dark:text-white leading-tight">{user.displayName}</p>
                  <p className="text-xs text-neutral-400 font-medium">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                 <button className="w-full p-4 flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all group">
                    <User className="w-5 h-5 text-neutral-400 group-hover:text-orange-500" />
                    <span className="text-sm font-bold dark:text-white">Account Details</span>
                 </button>
                 <button className="w-full p-4 flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all group">
                    <Settings className="w-5 h-5 text-neutral-400 group-hover:text-orange-500" />
                    <span className="text-sm font-bold dark:text-white">Settings</span>
                 </button>
                 <button className="w-full p-4 flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all group">
                    <Shield className="w-5 h-5 text-neutral-400 group-hover:text-orange-500" />
                    <span className="text-sm font-bold dark:text-white">Privacy Policy</span>
                 </button>
              </div>
            </div>

            <div className="p-8 border-t border-neutral-100 dark:border-neutral-800">
               <button 
                 onClick={logout}
                 className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-transform"
               >
                 <LogOut className="w-4 h-4" /> Sign Out
               </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
