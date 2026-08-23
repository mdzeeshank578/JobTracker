import express from 'express';
import { authController } from '../controllers/auth.controller.js';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

// Redirect to Provider OAuth
router.get('/connect/:provider', (req, res) => {
  const { provider } = req.params;
  const { userId } = req.query;
  const redirectUri = env.FRONTEND_URL || 'http://localhost:5173';

  if (provider === 'google') {
    const isConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== 'your_client_id.apps.googleusercontent.com');

    if (isConfigured) {
      const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const options = {
        redirect_uri: `${env.BACKEND_URL}/api/auth/callback/google`,
        client_id: env.GOOGLE_CLIENT_ID,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'select_account',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/gmail.readonly'
        ].join(' '),
        state: userId || ''
      };
      if (req.query.email && req.query.email.includes('@')) {
        options.login_hint = req.query.email;
      }
      const qs = new URLSearchParams(options).toString();
      return res.redirect(`${rootUrl}?${qs}`);
    } else {
      const userEmail = req.query.email || '';
      const cleanEmail = userEmail.toLowerCase().trim();
      const safeUserId = (userId && userId !== 'undefined') ? userId : (cleanEmail ? `user_${cleanEmail.replace(/[^a-z0-9]/g, '')}` : 'guest');
      return res.redirect(`${redirectUri}?sync_connected=true&provider=google&email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(safeUserId)}`);
    }
  }

  res.status(400).json({ error: 'Unsupported OAuth provider' });
});

// Google OAuth Callback
router.get('/callback/google', async (req, res) => {
  const { code, state: userId } = req.query;
  const redirectUri = env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${redirectUri}?sync_error=no_code`);
  }

  try {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.BACKEND_URL}/api/auth/callback/google`,
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
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileResponse.json();
    const email = profile.email || '';

    const safeUserId = (userId && userId !== 'undefined') ? userId : `user_${email.replace(/[^a-z0-9]/g, '')}`;

    res.redirect(`${redirectUri}?sync_connected=true&provider=google&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(safeUserId)}`);
  } catch (error) {
    console.error('Google Callback Error:', error);
    res.redirect(`${redirectUri}?sync_error=${encodeURIComponent(error.message)}`);
  }
});

export default router;
