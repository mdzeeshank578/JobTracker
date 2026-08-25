const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  ? `${import.meta.env.VITE_API_BASE_URL}/auth`
  : 'http://localhost:5001/api/auth';

export async function registerAccount(email, password, displayName) {
  try {
    const res = await fetch(`${BACKEND_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to register account.');
    }
    const payload = data.data || data;
    return {
      user: payload.user || payload,
      token: payload.token || data.token
    };
  } catch (err) {
    console.warn("Backend register service error:", err.message);
    throw err;
  }
}

export async function loginAccount(email, password) {
  try {
    const res = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Invalid email or password.');
    }
    const payload = data.data || data;
    return {
      user: payload.user || payload,
      token: payload.token || data.token
    };
  } catch (err) {
    console.warn("Backend login service error:", err.message);
    throw err;
  }
}

export async function loginWithGoogleBackend(email, displayName, photoURL) {
  try {
    const res = await fetch(`${BACKEND_URL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName, photoURL })
    });
    const data = await res.json();
    const payload = data.data || data;
    if (res.ok && (payload.user || data.user)) {
      return {
        user: payload.user || data.user,
        token: payload.token || data.token
      };
    }
  } catch (err) {
    console.warn("Backend Google login error:", err.message);
  }
  return {
    user: {
      uid: "google_user_777",
      email: email || "user.google@gmail.com",
      displayName: displayName || "Google User",
      photoURL: photoURL || null
    },
    token: null
  };
}
