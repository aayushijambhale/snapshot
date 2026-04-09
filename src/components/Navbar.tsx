import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import { Camera, LogIn, LogOut, LayoutDashboard, UserCircle, Sparkles } from 'lucide-react';

export function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav className="glass sticky top-0 z-50 transition-all duration-500 border-b border-neutral-100 dark:border-neutral-800">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 bg-orange-500 rounded-lg group-hover:rotate-12 transition-all duration-500 shadow-lg shadow-orange-200 dark:shadow-none">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-black text-xl tracking-tighter dark:text-white leading-none">Snap<span className="text-orange-500">Search</span></span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-5">
          <div className="hidden lg:flex items-center gap-0.5 bg-neutral-100/50 dark:bg-neutral-900/50 p-0.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800">
            <Link to="/ai-lab" className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 hover:text-orange-500 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-all flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              AI Lab
            </Link>
            <Link to="/client" className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 hover:text-orange-500 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-all flex items-center gap-1.5">
              <LayoutDashboard className="w-3 h-3" />
              Dashboard
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-4 sm:gap-5">
              <NotificationCenter />
              <Link to="/profile" className="flex items-center gap-3 group">
                <div className="relative shrink-0">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || ''} 
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-xl border-2 border-white dark:border-neutral-800 shadow-md group-hover:border-orange-500 transition-all object-cover" 
                    />
                  ) : (
                    <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-neutral-950 rounded-full" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[11px] font-black leading-none dark:text-white">{user.displayName?.split(' ')[0]}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-orange-500 mt-1">Pro Member</p>
                </div>
              </Link>
              <button
                onClick={logout}
                className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-neutral-400 hover:text-red-500 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2.5 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
