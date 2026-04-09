import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  Sparkles, 
  User, 
  PlusCircle,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/client' },
    { icon: Sparkles, label: 'AI Lab', path: '/ai-lab' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  if (!user) return null;

  return (
    <nav className="lg:hidden fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md">
      <div className="glass-dark p-3 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                relative p-4 rounded-full transition-all group
                ${isActive ? 'text-orange-500' : 'text-neutral-400 hover:text-white'}
              `}
            >
              <item.icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              
              {isActive && (
                <motion.div
                  layoutId="mobile-active-pill"
                  className="absolute inset-0 bg-orange-500/10 rounded-full border border-orange-500/20"
                />
              )}
              
              {isActive && (
                <motion.div
                  layoutId="mobile-active-dot"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
