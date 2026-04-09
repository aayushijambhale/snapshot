import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithCredential, GoogleAuthProvider, signOut, updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isServerAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string, photoURL?: string) => Promise<void>;
  checkServerSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isServerAuthenticated, setIsServerAuthenticated] = useState(false);

  const checkServerSession = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const authenticated = response.ok;
      setIsServerAuthenticated(authenticated);
      return authenticated;
    } catch (error) {
      setIsServerAuthenticated(false);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        checkServerSession();
      } else {
        setIsServerAuthenticated(false);
      }
      setLoading(false);
    });

    // Listen for auth success messages from popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data.idToken) {
        try {
          const credential = GoogleAuthProvider.credential(event.data.idToken);
          await signInWithCredential(auth, credential);
          toast.success('Logged in with Google!');
        } catch (error) {
          console.error('Firebase Auth Error:', error);
          toast.error('Failed to sync with database');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const login = async () => {
    try {
      const response = await fetch('/api/auth/google/url', { credentials: 'include' });
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url, 
        'google_auth', 
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site.');
        return;
      }

      // Poll for window close to check session
      const pollTimer = setInterval(async () => {
        if (authWindow.closed) {
          clearInterval(pollTimer);
          await checkServerSession();
        }
      }, 500);

    } catch (error) {
      console.error('Login Error:', error);
      toast.error('Failed to initiate login');
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout Error:', error);
      toast.error('Failed to logout');
    }
  };

  const updateProfile = async (displayName: string, photoURL?: string) => {
    if (!auth.currentUser) return;
    await firebaseUpdateProfile(auth.currentUser, { displayName, photoURL });
    setUser({ ...auth.currentUser } as User);
    toast.success('Profile updated');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isServerAuthenticated, login, logout, updateProfile, checkServerSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
