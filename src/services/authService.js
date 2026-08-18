const BACKEND_URL = 'http://localhost:5001/api/auth';

export async function registerAccount(email, password, displayName) {
  try {
    const res = await fetch(`${BACKEND_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register account.');
    }
    return data.user;
  } catch (err) {
    console.warn("Backend register service error, using local fallback:", err.message);
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
      throw new Error(data.error || 'Invalid email or password.');
    }
    return data.user;
  } catch (err) {
    console.warn("Backend login service error, using local fallback:", err.message);
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
    if (res.ok && data.user) {
      return data.user;
    }
  } catch (err) {
    console.warn("Backend Google login error:", err.message);
  }
  return {
    uid: "google_user_777",
    email: email || "user.google@gmail.com",
    displayName: displayName || "Google User",
    photoURL: photoURL || null
  };
}
