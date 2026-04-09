import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

interface GoogleDriveContextType {
  isConnected: boolean;
  connect: () => Promise<void>;
  createFolder: (name: string, parentId?: string) => Promise<any>;
  uploadFile: (name: string, content: string, mimeType: string, parentId?: string) => Promise<any>;
  uploadJson: (name: string, data: any, parentId?: string) => Promise<any>;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

export function GoogleDriveProvider({ children }: { children: React.ReactNode }) {
  const { user, login } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(!!user);
  }, [user]);

  const connect = async () => {
    await login();
  };

  const createFolder = async (name: string, parentId?: string) => {
    try {
      const response = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to create folder');
      return await response.json();
    } catch (error) {
      console.error('Folder Error:', error);
      throw error;
    }
  };

  const uploadFile = async (name: string, content: string, mimeType: string, parentId?: string) => {
    try {
      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, mimeType, parentId }),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to upload file');
      return await response.json();
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  };

  const uploadJson = async (name: string, data: any, parentId?: string) => {
    try {
      const response = await fetch('/api/drive/upload-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data, parentId }),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to upload JSON');
      return await response.json();
    } catch (error) {
      console.error('JSON Upload Error:', error);
      throw error;
    }
  };

  return (
    <GoogleDriveContext.Provider value={{ isConnected, connect, createFolder, uploadFile, uploadJson }}>
      {children}
    </GoogleDriveContext.Provider>
  );
}

export function useGoogleDrive() {
  const context = useContext(GoogleDriveContext);
  if (context === undefined) {
    throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
  }
  return context;
}
