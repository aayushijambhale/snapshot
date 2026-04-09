import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Debug middleware to track authentication state
  app.use((req, reqRes, next) => {
    const hasTokens = !!req.cookies.google_tokens;
    if (req.path.startsWith('/api/')) {
      console.log(`[API] ${req.method} ${req.path} - Auth Cookie: ${hasTokens ? 'Present' : 'MISSING'}`);
    }
    next();
  });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`
  );

  // Helper to get authorized OAuth2 client
  async function getAuthorizedClient(req: express.Request, res: express.Response) {
    const tokensStr = req.cookies.google_tokens;
    if (!tokensStr) return null;

    try {
      const tokens = JSON.parse(tokensStr);
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`
      );
      client.setCredentials(tokens);

      // Listen for refresh
      client.on('tokens', (newTokens) => {
        console.log('[Auth] Tokens refreshed, updating cookie');
        const mergedTokens = { ...tokens, ...newTokens };
        res.cookie('google_tokens', JSON.stringify(mergedTokens), {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
      });

      return client;
    } catch (error) {
      console.error('Error parsing tokens:', error);
      return null;
    }
  }

  // Helper to get authorized drive client
  async function getDriveClient(req: express.Request, res: express.Response) {
    const client = await getAuthorizedClient(req, res);
    if (!client) return null;
    return google.drive({ version: 'v3', auth: client });
  }

  // API Routes
  app.get('/api/auth/google/url', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/generative-language'
      ],
      prompt: 'consent'
    });
    res.json({ url });
  });

  app.get('/api/auth/me', async (req, res) => {
    const tokensStr = req.cookies.google_tokens;
    if (!tokensStr) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const tokens = JSON.parse(tokensStr);
      oauth2Client.setCredentials(tokens);
      
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      res.json({
        uid: userInfo.data.id,
        displayName: userInfo.data.name,
        email: userInfo.data.email,
        photoURL: userInfo.data.picture
      });
    } catch (error) {
      console.error('Auth Me Error:', error);
      res.status(401).json({ error: 'Session expired' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('google_tokens');
    res.json({ success: true });
  });

  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store tokens in a secure cookie
      res.cookie('google_tokens', JSON.stringify(tokens), {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS',
                  idToken: ${JSON.stringify(tokens.id_token)}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.post('/api/drive/create-folder', async (req, res) => {
    const { name, parentId } = req.body;
    
    try {
      const drive = await getDriveClient(req, res);
      if (!drive) return res.status(401).json({ error: 'Not authenticated' });

      const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : []
      };

      const folder = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink'
      });

      console.log(`[Drive] Created folder: ${name} (${folder.data.id})`);
      res.json(folder.data);
    } catch (error) {
      console.error('Drive Error:', error);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  app.post('/api/drive/upload', async (req, res) => {
    const { name, content, mimeType, parentId } = req.body;

    try {
      const drive = await getDriveClient(req, res);
      if (!drive) return res.status(401).json({ error: 'Not authenticated' });

      // Content is base64
      const buffer = Buffer.from(content.split(',')[1], 'base64');
      const { Readable } = await import('stream');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata = {
        name: name,
        parents: parentId ? [parentId] : []
      };

      const media = {
        mimeType: mimeType,
        body: stream
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      console.log(`[Drive] Uploaded file: ${name} (${file.data.id})`);
      res.json(file.data);
    } catch (error) {
      console.error('Upload Error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  app.post('/api/drive/upload-json', async (req, res) => {
    const { name, data, parentId } = req.body;

    try {
      const drive = await getDriveClient(req, res);
      if (!drive) return res.status(401).json({ error: 'Not authenticated' });

      const { Readable } = await import('stream');
      const stream = new Readable();
      stream.push(JSON.stringify(data, null, 2));
      stream.push(null);

      const fileMetadata = {
        name: `${name}.json`,
        parents: parentId ? [parentId] : []
      };

      const media = {
        mimeType: 'application/json',
        body: stream
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      console.log(`[Drive] Uploaded JSON: ${name}.json (${file.data.id})`);
      res.json(file.data);
    } catch (error) {
      console.error('JSON Upload Error:', error);
      res.status(500).json({ error: 'Failed to upload JSON' });
    }
  });

  // AI Proxy Routes
  app.post('/api/ai/proxy', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const { model, contents, generationConfig } = req.body;

      if (apiKey) {
        console.log(`[AI] Using API Key for model: ${model}`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ contents, generationConfig })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'AI API Error');
        }

        const data = await response.json();
        return res.json(data);
      }

      // Fallback to OAuth if API key is not available
      console.log(`[AI] Falling back to OAuth for model: ${model}`);
      const client = await getAuthorizedClient(req, res);
      if (!client) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { token } = await client.getAccessToken();
      if (!token) throw new Error('Failed to get access token');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contents, generationConfig })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'AI API Error');
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('AI Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`APP_URL: ${process.env.APP_URL || 'Not set (using localhost)'}`);
  });
}

startServer();
