import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Camera, 
  Search, 
  User, 
  Sparkles, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Home,
  PlusCircle,
  Bell,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/client' },
    { icon: Sparkles, label: 'AI Lab', path: '/ai-lab' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  if (!user) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? '100px' : '320px' }}
      className="hidden lg:flex flex-col h-screen sticky top-0 bg-white dark:bg-neutral-950 border-r border-neutral-100 dark:border-neutral-800 z-40 transition-all duration-500 ease-in-out"
    >
      {/* Logo Section */}
      <div className="p-10 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-4"
            >
              <div className="p-3 bg-orange-500 rounded-[1.25rem] shadow-xl shadow-orange-200 dark:shadow-none rotate-3">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-3xl tracking-tighter dark:text-white">Snap<span className="text-orange-500">Search</span></span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-2xl transition-all text-neutral-400 hover:text-orange-500 border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-6 py-10 space-y-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-5 p-5 rounded-[2.5rem] transition-all group relative
                ${isActive 
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl' 
                  : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900'}
              `}
            >
              <item.icon className={`w-6 h-6 shrink-0 transition-transform group-hover:scale-110 ${isActive ? '' : 'opacity-60 group-hover:opacity-100'}`} />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-black text-xs uppercase tracking-[0.2em]"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute right-6 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.8)]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-8 border-t border-neutral-50 dark:border-neutral-800 space-y-6">
        <Link 
          to="/profile"
          className={`
            flex items-center gap-4 p-4 rounded-[3rem] transition-all group
            ${isCollapsed ? 'justify-center' : 'bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
          `}
        >
          <div className="relative shrink-0">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || ''} 
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-[1.5rem] object-cover border-2 border-white dark:border-neutral-800 shadow-lg" 
              />
            ) : (
              <div className="w-14 h-14 bg-orange-500 rounded-[1.5rem] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-200 dark:shadow-none">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-neutral-900 rounded-full" />
          </div>
          
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-black truncate dark:text-white">{user.displayName}</p>
              <p className="micro-label text-orange-500">Pro Member</p>
            </motion.div>
          )}
        </Link>

        {!isCollapsed && (
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 p-4 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        )}
      </div>
    </motion.aside>
  );
}
