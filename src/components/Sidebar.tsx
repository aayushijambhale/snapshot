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
  LogOut,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout, role } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    ...(role === 'organizer' ? [
      { icon: Camera, label: 'Studio', path: '/photographer' },
      { icon: LayoutDashboard, label: 'Admin', path: '/admin' },
    ] : []),
    { icon: Sparkles, label: 'AI Lab', path: '/ai-lab' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  if (!user) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? '72px' : '280px' }}
      className="hidden lg:flex flex-col h-screen sticky top-0 bg-white dark:bg-[#050507] border-r border-neutral-100 dark:border-white/5 z-40 transition-all duration-500 ease-in-out"
    >
      {/* Logo Section */}
      <div className="p-8 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-xl shadow-indigo-500/30 rotate-3 group cursor-pointer hover:rotate-12 transition-transform">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-2xl tracking-tighter text-black dark:text-white">Lens<span className="text-indigo-600">Link</span></span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2.5 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-xl transition-all text-neutral-400 hover:text-indigo-600 border border-transparent"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-4 p-4 rounded-[1.25rem] transition-all group relative
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5'}
              `}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`} />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-black text-[10px] uppercase tracking-[0.25em]"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-6 border-t border-neutral-100 dark:border-white/5 space-y-4">
        <Link 
          to="/profile"
          className={`
            flex items-center gap-4 p-3 rounded-2xl transition-all group
            ${isCollapsed ? 'justify-center' : 'bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10'}
          `}
        >
          <div className="relative shrink-0">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || ''} 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-neutral-800 shadow-xl" 
              />
            ) : (
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-xl">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-[3px] border-white dark:border-[#050507] rounded-full" />
          </div>
          
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-xs font-black truncate dark:text-white">{user.displayName}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Vault Access: ON</p>
            </motion.div>
          )}
        </Link>

        {!isCollapsed && (
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-4 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.25em]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}
      </div>
    </motion.aside>
  );
}
