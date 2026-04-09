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
      animate={{ width: isCollapsed ? '72px' : '240px' }}
      className="hidden lg:flex flex-col h-screen sticky top-0 bg-white dark:bg-neutral-950 border-r border-neutral-100 dark:border-neutral-800 z-40 transition-all duration-500 ease-in-out"
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2.5"
            >
              <div className="p-1.5 bg-orange-500 rounded-lg shadow-lg shadow-orange-200 dark:shadow-none rotate-3">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter dark:text-white">Snap<span className="text-orange-500">Search</span></span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg transition-all text-neutral-400 hover:text-orange-500 border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3.5 p-3 rounded-xl transition-all group relative
                ${isActive 
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' 
                  : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900'}
              `}
            >
              <item.icon className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? '' : 'opacity-60 group-hover:opacity-100'}`} />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-black text-[9px] uppercase tracking-[0.15em]"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute right-3 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-neutral-50 dark:border-neutral-800 space-y-3">
        <Link 
          to="/profile"
          className={`
            flex items-center gap-2.5 p-2.5 rounded-xl transition-all group
            ${isCollapsed ? 'justify-center' : 'bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
          `}
        >
          <div className="relative shrink-0">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || ''} 
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover border-2 border-white dark:border-neutral-800 shadow-md" 
              />
            ) : (
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full" />
          </div>
          
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-[11px] font-black truncate dark:text-white">{user.displayName}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-orange-500">Pro Member</p>
            </motion.div>
          )}
        </Link>

        {!isCollapsed && (
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all font-black text-[9px] uppercase tracking-widest"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        )}
      </div>
    </motion.aside>
  );
}
