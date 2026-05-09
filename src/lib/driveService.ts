import { toast } from 'sonner';

/**
 * Service to handle Google Drive API interactions
 */
export const driveService = {
  /**
   * Upload a base64 image to Google Drive
   */
  async uploadImage(name: string, content: string, mimeType: string, parentId: string) {
    try {
      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, mimeType, parentId }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Drive upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Drive Service Error:', error);
      throw error;
    }
  },

  /**
   * Create a folder in Google Drive
   */
  async createFolder(name: string, parentId?: string) {
    try {
      const response = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Folder creation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Drive Service Folder Error:', error);
      throw error;
    }
  },

  /**
   * Upload JSON metadata to Google Drive
   */
  async uploadJson(name: string, data: any, parentId: string) {
    try {
      const response = await fetch('/api/drive/upload-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data, parentId }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'JSON upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Drive Service JSON Error:', error);
      throw error;
    }
  }
};
