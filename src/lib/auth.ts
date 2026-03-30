// Auth Service using Google Identity Services (GSI)
const AUTH_KEY = 'snapsearch_mock_auth';
const TOKEN_KEY = 'snapsearch_drive_token';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  accessToken?: string; // OAuth2 Access Token for Drive API
}

function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT', e);
    return null;
  }
}

function loadUser(): User | null {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  const user = JSON.parse(data);
  user.accessToken = localStorage.getItem(TOKEN_KEY) || undefined;
  return user;
}

function saveUser(user: User | null) {
  if (user) {
    const { accessToken, ...userData } = user;
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
  window.dispatchEvent(new CustomEvent('auth_change'));
}

export const auth = {
  get currentUser() { return loadUser(); }
};

let gsiInitialized = false;
let tokenClient: any = null;

export function onAuthStateChanged(authInstance: any, callback: (user: User | null) => void) {
  const handler = () => {
    callback(loadUser());
  };

  window.addEventListener('auth_change', handler);
  handler(); // Initial call

  // Initialize GSI if script is loaded
  if (!gsiInitialized && (window as any).google && CLIENT_ID) {
    (window as any).google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response: any) => {
        const payload = decodeJWT(response.credential);
        if (payload) {
          const user: User = {
            uid: payload.sub,
            displayName: payload.name,
            photoURL: payload.picture,
            email: payload.email
          };
          saveUser(user);
          // After identity check, start OAuth token flow for Drive
          requestDriveAccess();
        }
      }
    });

    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          const user = loadUser();
          if (user) {
            user.accessToken = tokenResponse.access_token;
            saveUser(user);
          }
        }
      },
    });

    gsiInitialized = true;
  }

  return () => window.removeEventListener('auth_change', handler);
}

export function requestDriveAccess() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
}

export async function signInWithPopup() {
  if (!(window as any).google) {
    throw new Error('Google Identity Services script not loaded');
  }
  
  // Triggers the identity prompt (One Tap or standard)
  (window as any).google.accounts.id.prompt();
}

export async function signOut() {
  saveUser(null);
  if ((window as any).google) {
    (window as any).google.accounts.id.disableAutoSelect();
  }
}

export async function updateProfile(user: User, { displayName, photoURL }: { displayName?: string, photoURL?: string }) {
  const updatedUser = { ...user, displayName: displayName || user.displayName, photoURL: photoURL || user.photoURL };
  saveUser(updatedUser);
}

export class GoogleAuthProvider {}
