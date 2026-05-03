import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, updateProfile as firebaseUpdateProfile } from 'firebase/auth';
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

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      const result = await signInWithPopup(auth, provider);
      
      // Get the OAuth credential to extract the access token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      
      if (accessToken) {
        // Send access token to server to store in cookies
        await fetch('/api/auth/set-drive-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
          credentials: 'include'
        });
        console.log('[Auth] Drive token stored on server');
      }
      
      console.log('[Auth] Successfully signed in:', result.user.email);
      toast.success('Logged in with Google!');
      
      // Verify server session is updated
      await checkServerSession();
    } catch (error: any) {
      console.error('Login Error:', error?.message, error?.code);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User cancelled, don't show error
      } else {
        toast.error('Failed to login with Google');
      }
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
