import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import { Camera, LogIn, LogOut, LayoutDashboard, UserCircle, Sparkles, QrCode } from 'lucide-react';
import { useState } from 'react';
import { QRScannerModal } from './QRScannerModal';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { user, login, logout } = useAuth();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <nav className="glass-card sticky top-0 z-50 transition-all duration-500 border-b border-neutral-100 dark:border-white/5 bg-white/70 dark:bg-[#050507]/60 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2.5 bg-indigo-600 rounded-xl group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-indigo-500/20">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-black text-2xl tracking-tighter dark:text-white leading-none">Snap<span className="text-indigo-600">Search</span></span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden lg:flex items-center gap-1 bg-neutral-100/50 dark:bg-white/5 p-1 rounded-2xl border border-neutral-200/50 dark:border-white/10">
            <Link to="/ai-lab" className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Lab
            </Link>
            <Link to="/photographer" className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Studio
            </Link>
            <Link to="/admin" className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-red-500 hover:bg-white dark:hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Admin
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="p-3 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-xl transition-all text-neutral-400 hover:text-indigo-600"
                title="Scan QR"
              >
                <QrCode className="w-5 h-5" />
              </button>
              <ThemeToggle />
              <NotificationCenter />
              <Link to="/profile" className="flex items-center gap-4 group">
                <div className="relative shrink-0">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || ''} 
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl border-2 border-white dark:border-neutral-800 shadow-xl group-hover:border-indigo-600 transition-all object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-xl">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#050507] rounded-full" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[11px] font-black leading-none dark:text-white">{user.displayName?.split(' ')[0]}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-indigo-500 mt-1">Vault Pro</p>
                </div>
              </Link>
              <button
                onClick={logout}
                className="p-3 hover:bg-red-500/10 rounded-xl transition-all text-neutral-400 hover:text-red-500"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-indigo-500/30 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </nav>
  );
}
