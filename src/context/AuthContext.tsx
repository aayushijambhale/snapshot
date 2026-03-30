import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, updateProfile as mockUpdateProfile, auth } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup();
  };

  const logout = async () => {
    await signOut();
  };

  const updateProfile = async (displayName: string, photoURL?: string) => {
    if (!auth.currentUser) return;
    await mockUpdateProfile(auth.currentUser, { displayName, photoURL });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile }}>
      {!loading && children}
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
