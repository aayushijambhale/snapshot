import { auth, requestDriveAccess } from './auth';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webViewLink';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

async function getAccessToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user || !user.accessToken) {
    requestDriveAccess();
    throw new Error('Access token missing. Requesting access...');
  }
  return user.accessToken;
}

export async function createDriveFolder(name: string): Promise<string> {
  const token = await getAccessToken();
  const response = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
       requestDriveAccess();
       throw new Error('Drive session expired. Please re-authenticate.');
    }
    const error = await response.json();
    throw new Error(`Drive Create Folder Error: ${error.error?.message || response.statusText}`);
  }

  const folder = await response.json();
  await makeFilePublic(folder.id, token);
  return folder.id;
}

async function makeFilePublic(fileId: string, token: string) {
  try {
    await fetch(`${DRIVE_API_URL}/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (e) {
    console.error('Error making file public:', e);
  }
}

export async function uploadToDrive(file: File | Blob, name: string, folderId: string): Promise<string> {
  const token = await getAccessToken();
  
  const metadata = {
    name: name,
    parents: [folderId]
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const response = await fetch(UPLOAD_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Drive Upload Error: ${error.error?.message || response.statusText}`);
  }

  const driveFile: DriveFile = await response.json();
  await makeFilePublic(driveFile.id, token);
  
  /**
   * REVISED URL STRATEGY:
   * 1. Use API-returned 'thumbnailLink' if available (highest reliability).
   * 2. Replace the default small size (=s220) with a high-res one (=s1600).
   * 3. Fallback to manually constructed thumbnail URL.
   */
  if (driveFile.thumbnailLink) {
    // Drive returns thumbnailLink ending in =s220. We switch to =s1600 for high-res.
    return driveFile.thumbnailLink.replace(/=s\d+$/, '=s1600');
  }

  return `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w1600`;
}

export async function deleteFromDrive(fileId: string) {
  const token = await getAccessToken();
  await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
