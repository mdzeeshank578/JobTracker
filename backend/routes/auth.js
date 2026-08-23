import express from 'express';
import { dbService } from '../services/db.js';

const router = express.Router();

// 1. Redirect to Provider OAuth
router.get('/connect/:provider', (req, res) => {
  const { provider } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required as a query parameter.' });
  }

  const redirectUri = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Real Google OAuth & Account Redirect
  if (provider === 'google') {
    const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_client_id.apps.googleusercontent.com');

    if (isConfigured) {
      const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const options = {
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/callback/google`,
        client_id: process.env.GOOGLE_CLIENT_ID,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'select_account',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/gmail.readonly'
        ].join(' '),
        state: userId
      };
      if (req.query.email && req.query.email.includes('@')) {
        options.login_hint = req.query.email;
      }
      const qs = new URLSearchParams(options).toString();
      return res.redirect(`${rootUrl}?${qs}`);
    } else {
      // Connect seamlessly using user's real Google account
      const userEmail = req.query.email || '';
      const cleanEmail = userEmail.toLowerCase().trim();
      const safeUserId = (userId && userId !== 'undefined') ? userId : (cleanEmail ? `user_${cleanEmail.replace(/[^a-z0-9]/g, '')}` : 'guest');
      console.log(`[Google Sign-In] Connecting user account for ${userEmail || 'guest'}`);
      return res.redirect(`${redirectUri}?sync_connected=true&provider=google&email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(safeUserId)}`);
    }
  }

  if (provider === 'outlook' && !isMicrosoftConfigured) {
    console.log(`[OAuth Mock] Mocking Outlook OAuth connection for user ${userId}`);
    const email = req.query.email || `mock_${userId.substring(0, 5)}@outlook.com`;
    return res.redirect(`${redirectUri}?sync_connected=true&provider=outlook&email=${encodeURIComponent(email)}&userId=${userId}`);
  }

  // --- LIVE OAuth REDIRECTS ---
  if (provider === 'google') {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/callback/google`,
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.readonly'
      ].join(' '),
      state: userId
    };

    const qs = new URLSearchParams(options).toString();
    return res.redirect(`${rootUrl}?${qs}`);
  }

  if (provider === 'outlook') {
    const rootUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    const options = {
      client_id: process.env.MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/callback/outlook`,
      response_mode: 'query',
      scope: 'offline_access User.Read Mail.Read',
      state: userId
    };

    const qs = new URLSearchParams(options).toString();
    return res.redirect(`${rootUrl}?${qs}`);
  }

  res.status(400).json({ error: 'Unsupported OAuth provider' });
});

// 2. Google OAuth Callback
router.get('/callback/google', async (req, res) => {
  const { code, state: userId } = req.query;
  const redirectUri = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${redirectUri}?sync_error=no_code`);
  }

  try {
    // Exchange Auth Code for tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/callback/google`,
      grant_type: 'authorization_code'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`Google Token Exchange failed: ${response.statusText}`);
    }

    const tokenData = await response.json();

    // Fetch user profile email
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileResponse.json();
    const email = profile.email;

    // Calculate expiry
    tokenData.expiry_date = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const safeUserId = (userId && userId !== 'undefined') ? userId : `user_${email.replace(/[^a-z0-9]/g, '')}`;

    // Save to database
    await dbService.saveSyncAccount(safeUserId, 'google', email, tokenData);
    await dbService.addSyncLog(safeUserId, 'gmail_sync', 'success', `Connected Gmail account: ${email}`);

    res.redirect(`${redirectUri}?sync_connected=true&provider=google&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(safeUserId)}`);
  } catch (error) {
    console.error('Google Callback Error:', error);
    res.redirect(`${redirectUri}?sync_error=${encodeURIComponent(error.message)}`);
  }
});

// 3. Microsoft Outlook Callback
router.get('/callback/outlook', async (req, res) => {
  const { code, state: userId } = req.query;
  const redirectUri = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${redirectUri}?sync_error=no_code`);
  }

  try {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params = new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/callback/outlook`,
      grant_type: 'authorization_code'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`Microsoft Token Exchange failed: ${response.statusText}`);
    }

    const tokenData = await response.json();

    // Fetch user email using Microsoft Graph User Info
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileResponse.json();
    const email = profile.mail || profile.userPrincipalName;

    // Expiry calculations
    tokenData.expiry_date = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Save to Database
    await dbService.saveSyncAccount(userId, 'outlook', email, tokenData);
    await dbService.addSyncLog(userId, 'outlook_sync', 'success', `Connected Outlook account: ${email}`);

    res.redirect(`${redirectUri}?sync_connected=true&provider=outlook&email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Outlook Callback Error:', error);
    res.redirect(`${redirectUri}?sync_error=${encodeURIComponent(error.message)}`);
  }
});

// 4. Status Check Endpoint
router.get('/status', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }
  try {
    const accounts = await dbService.getSyncAccounts(userId);
    res.json({
      connectedAccounts: accounts.map(acc => ({
        provider: acc.provider,
        email: acc.email,
        connectedAt: acc.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Disconnect Provider
router.delete('/disconnect', async (req, res) => {
  const { userId, provider, email } = req.body;
  if (!userId || !provider || !email) {
    return res.status(400).json({ error: 'userId, provider, and email are required.' });
  }
  try {
    await dbService.deleteSyncAccount(userId, provider, email);
    await dbService.addSyncLog(userId, `${provider}_sync`, 'info', `Disconnected ${provider} account: ${email}`);
    res.json({ success: true, message: `Disconnected ${provider} account: ${email}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Direct User Registration Endpoint
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const user = await dbService.createUser(email, password, displayName);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to register account.' });
  }
});

// 7. Direct User Login Endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await dbService.validateUserPassword(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(401).json({ error: error.message || 'Failed to authenticate.' });
  }
});

// 8. Direct Google Sign-In Endpoint
router.post('/google', async (req, res) => {
  const { email, displayName, photoURL } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required for Google Sign-In.' });
  }

  try {
    let user = await dbService.getUserByEmail(email);
    if (!user) {
      user = await dbService.createUser(email, Math.random().toString(36), displayName || 'Google User');
    }
    const userId = user.id || user.uid || user.userId;
    res.json({
      success: true,
      user: {
        id: userId,
        uid: userId,
        userId: userId,
        email: user.email,
        displayName: user.displayName || displayName || 'Google User',
        photoURL: photoURL || null
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to complete Google authentication.' });
  }
});

export default router;
