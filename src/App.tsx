import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { EventGallery } from './pages/EventGallery';
import { UploadPhoto } from './pages/UploadPhoto';
import { FaceSearch } from './pages/FaceSearch';
import { EventSettings } from './pages/EventSettings';
import { Profile } from './pages/Profile';
import { ClientDashboard } from './pages/ClientDashboard';
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
        {!user && <Navbar />}
        <main className={`flex-1 ${user ? 'p-4 sm:p-8 lg:p-12' : 'container mx-auto px-4 py-8'}`}>
          {children}
        </main>
        {user && <MobileBottomNav />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GoogleDriveProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/event/:eventId" element={<EventGallery />} />
              <Route path="/event/:eventId/upload" element={<UploadPhoto />} />
              <Route path="/event/:eventId/search" element={<FaceSearch />} />
              <Route path="/event/:eventId/settings" element={<EventSettings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/ai-lab" element={<AILab />} />
            </Routes>
          </Layout>
          <Toaster position="top-center" richColors />
        </Router>
      </GoogleDriveProvider>
    </AuthProvider>
  );
}
