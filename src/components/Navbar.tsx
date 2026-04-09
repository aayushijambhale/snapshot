import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import { Camera, LogIn, LogOut, LayoutDashboard, UserCircle, Sparkles } from 'lucide-react';

export function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav className="glass sticky top-0 z-50 transition-all duration-500 border-b border-neutral-100 dark:border-neutral-800">
      <div className="container mx-auto px-4 sm:px-6 h-24 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="p-3 bg-orange-500 rounded-[1.25rem] group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-orange-200 dark:shadow-none">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <span className="font-display font-black text-3xl tracking-tighter dark:text-white leading-none">Snap<span className="text-orange-500">Search</span></span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-8">
          <div className="hidden lg:flex items-center gap-2 bg-neutral-100/50 dark:bg-neutral-900/50 p-1.5 rounded-[1.5rem] border border-neutral-200/50 dark:border-neutral-800">
            <Link to="/ai-lab" className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-orange-500 hover:bg-white dark:hover:bg-neutral-800 rounded-2xl transition-all flex items-center gap-2.5">
              <Sparkles className="w-4 h-4" />
              AI Lab
            </Link>
            <Link to="/client" className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-orange-500 hover:bg-white dark:hover:bg-neutral-800 rounded-2xl transition-all flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-4 sm:gap-6">
              <NotificationCenter />
              <Link to="/profile" className="flex items-center gap-4 group">
                <div className="relative shrink-0">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || ''} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-[1.25rem] border-2 border-white dark:border-neutral-800 shadow-lg group-hover:border-orange-500 transition-all object-cover" 
                    />
                  ) : (
                    <div className="w-12 h-12 bg-orange-500 rounded-[1.25rem] flex items-center justify-center text-white font-black shadow-lg">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white dark:border-neutral-950 rounded-full" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-black leading-none dark:text-white">{user.displayName?.split(' ')[0]}</p>
                  <p className="micro-label text-orange-500 mt-1">Pro Member</p>
                </div>
              </Link>
              <button
                onClick={logout}
                className="p-3.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all text-neutral-400 hover:text-red-500 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
