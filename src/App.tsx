import React from 'react';
import { Camera } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { EventManager as Home } from './components/EventManager';
import { Gallery as EventGallery } from './components/Gallery';
import { PhotographerPanel } from './components/PhotographerPanel';
import { AdminPage } from './components/AdminPage';
import { ProfilePage as Profile } from './components/ProfilePage';
import { GoogleLoginSplash } from './components/GoogleLoginSplash';
import { AILab } from './components/AILab';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GoogleDriveProvider } from './context/GoogleDriveContext';
import { Toaster } from 'sonner';

function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  
  // Don't show sidebar/navbar on landing page if not logged in
  const isLandingPage = location.pathname === '/';
  const showNav = user || !isLandingPage;

  return (
    <div className="flex min-h-screen">
      {user && <Sidebar />}
      
      <div className="flex-1 flex flex-col min-w-0">
        <main className={`flex-1 ${user ? 'p-4 sm:p-8 lg:p-12' : ''}`}>
          {children}
        </main>
        {user && <MobileBottomNav />}
      </div>
    </div>
  );
}

function Root() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050507] flex flex-col items-center justify-center gap-10 relative overflow-hidden">
        {/* Background Mesh for Loader */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        
        <div className="relative">
          <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-600 rounded-[2.5rem] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/40 rotate-12 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="space-y-2 text-center">
           <h2 className="text-2xl font-black tracking-tighter dark:text-white">Snap<span className="text-indigo-600">Search</span></h2>
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-neutral-400 animate-pulse">Initializing Identity Core</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleDriveProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Public Root handles Login Splash if not logged in */}
            <Route path="/" element={user ? <Home /> : <GoogleLoginSplash />} />
            
            {/* Protected Routes - only accessible if user exists */}
            <Route path="/event/:eventId" element={user ? <EventGallery /> : <GoogleLoginSplash />} />
            <Route path="/profile" element={user ? <Profile /> : <GoogleLoginSplash />} />
            <Route path="/photographer" element={user ? <PhotographerPanel /> : <GoogleLoginSplash />} />
            <Route path="/admin" element={user ? <AdminPage /> : <GoogleLoginSplash />} />
            <Route path="/ai-lab" element={user ? <AILab /> : <GoogleLoginSplash />} />

            {/* Catch-all redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        <Toaster position="top-center" richColors />
      </Router>
    </GoogleDriveProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
