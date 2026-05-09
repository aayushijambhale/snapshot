import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Shield, 
  Settings, 
  Image as ImageIcon, 
  Download, 
  LogOut, 
  Zap, 
  Camera,
  Globe,
  Bell,
  Lock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

export function ProfilePage() {
  const { user, logout, role } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32">
      {/* Header Profile Section */}
      <header className="relative py-24 px-12 rounded-[4rem] overflow-hidden group">
        {/* Animated Mesh Background for Profile */}
        <div className="absolute inset-0 bg-neutral-900">
           <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative shrink-0"
          >
            <div className="w-48 h-48 rounded-[3.5rem] border-4 border-white/10 p-2 glass-card">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover rounded-[2.5rem]" />
              ) : (
                <div className="w-full h-full bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-5xl font-black text-white">
                  {user.displayName?.charAt(0)}
                </div>
              )}
            </div>
            <div className="absolute -bottom-4 -right-4 p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-600/40 border-4 border-[#050507]">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </motion.div>

          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <h1 className="text-6xl font-black tracking-tighter text-white">{user.displayName}</h1>
                <span className="px-5 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {role === 'organizer' ? 'Elite Organizer' : 'Verified Attendee'}
                </span>
              </div>
              <p className="text-xl text-neutral-400 font-medium">{user.email}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-10">
               <div className="flex items-center gap-3">
                 <Zap className="w-5 h-5 text-indigo-500" />
                 <span className="micro-label text-neutral-500 tracking-widest">Joined {new Date(user.metadata.creationTime || '').toLocaleDateString()}</span>
               </div>
               <div className="flex items-center gap-3">
                 <Shield className="w-5 h-5 text-cyan-500" />
                 <span className="micro-label text-neutral-500 tracking-widest">Vault Encrypted</span>
               </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Tabs / Navigation */}
        <div className="lg:col-span-4 space-y-4">
          {[
            { id: 'settings', label: 'Security & Profile', icon: Lock },
            { id: 'activity', label: 'Discovery Activity', icon: Zap },
            { id: 'notifications', label: 'Push Notifications', icon: Bell }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between p-8 rounded-[2.5rem] transition-all group ${
                activeTab === tab.id 
                  ? 'glass-card border-indigo-500/30 text-indigo-600' 
                  : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-5">
                <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'text-indigo-600' : 'group-hover:text-indigo-600'}`} />
                <span className="text-sm font-black uppercase tracking-widest">{tab.label}</span>
              </div>
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-2 ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}

          <button
            onClick={logout}
            className="w-full flex items-center gap-5 p-8 rounded-[2.5rem] text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all group mt-10"
          >
            <LogOut className="w-6 h-6 group-hover:-translate-x-2 transition-transform" />
            <span className="text-sm font-black uppercase tracking-widest">Deactivate Session</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8 space-y-10">
           <section className="glass-card p-12 rounded-[3.5rem] space-y-12">
              <div className="space-y-4 border-b border-neutral-100 dark:border-white/5 pb-10">
                 <h2 className="text-4xl font-black dark:text-white tracking-tight capitalize">{activeTab} Details</h2>
                 <p className="text-neutral-400 font-medium">Manage your SnapSearch profile and security credentials.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="micro-label text-neutral-400 block px-4">Display Name</label>
                    <div className="p-6 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-[2rem] font-bold dark:text-white">
                       {user.displayName}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <label className="micro-label text-neutral-400 block px-4">Verified Endpoint</label>
                    <div className="p-6 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-[2rem] font-bold dark:text-white">
                       {user.email}
                    </div>
                 </div>
              </div>

              <div className="p-10 bg-indigo-500/5 border border-indigo-500/20 rounded-[3rem] flex items-center justify-between">
                 <div className="space-y-2">
                    <h4 className="text-xl font-black dark:text-white flex items-center gap-3">
                       <Shield className="w-6 h-6 text-indigo-500" /> Professional Access
                    </h4>
                    <p className="text-sm text-neutral-400 font-medium">Your account is secured with Google OAuth 2.0</p>
                 </div>
                 <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                    Reset Keys
                 </button>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
