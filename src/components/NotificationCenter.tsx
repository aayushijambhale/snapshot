import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Bell, BellOff, Check, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id: string) => {
    // Logic to delete if needed, but usually we just mark as read or hide
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-600 dark:text-neutral-400"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-900">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-neutral-50 dark:border-neutral-800 flex items-center justify-between">
                <h3 className="font-bold dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-orange-500 font-bold hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <BellOff className="w-8 h-8 text-neutral-200 dark:text-neutral-700 mx-auto" />
                    <p className="text-sm text-neutral-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      className={`p-4 border-b border-neutral-50 dark:border-neutral-800 flex gap-3 transition-colors ${!n.read ? 'bg-orange-50/30 dark:bg-orange-900/5' : ''}`}
                    >
                      <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!n.read ? 'bg-orange-500' : 'bg-transparent'}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className={`text-sm font-bold dark:text-white ${!n.read ? 'text-neutral-900' : 'text-neutral-500'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-neutral-400">
                            {n.timestamp?.toDate ? formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          {n.message}
                        </p>
                        {n.link && (
                          <Link 
                            to={n.link} 
                            onClick={() => {
                              setIsOpen(false);
                              markAsRead(n.id);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-500 hover:underline pt-1"
                          >
                            View Details <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                      {!n.read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 text-center">
                <Link 
                  to="/client" 
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  View All Activity
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
