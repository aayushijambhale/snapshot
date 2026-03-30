import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, LogIn, LogOut, User as UserIcon, LayoutDashboard, UserCircle } from 'lucide-react';

export function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Camera className="w-6 h-6 text-orange-500" />
          <span>SnapSearch</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/client" className="hidden md:flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-orange-500 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link to="/profile" className="flex items-center gap-2 text-sm font-medium hover:text-orange-500 transition-colors">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-neutral-100" />
                ) : (
                  <UserCircle className="w-8 h-8 p-1 bg-neutral-100 rounded-full" />
                )}
                <span className="hidden sm:inline">{user.displayName}</span>
              </Link>
              <button
                onClick={logout}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
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
