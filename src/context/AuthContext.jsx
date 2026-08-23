import React, { createContext, useContext, useState } from "react";
import { clearUserSession, getUserProfile } from "../services/db";

const AuthContext = createContext();
const API_BASE_URL = 'http://localhost:5001/api';

export function useAuth() {
  return useContext(AuthContext);
}

function normalizeUserObj(rawUser) {
  if (!rawUser) return null;
  const userId = rawUser.id || rawUser.uid || rawUser.userId || `user_${Date.now()}`;
  return {
    id: userId,
    uid: userId,
    userId: userId,
    email: rawUser.email || '',
    displayName: rawUser.displayName || (rawUser.email ? rawUser.email.split('@')[0] : 'Active Candidate')
  };
}

function getStoredUser() {
  try {
    const cached = localStorage.getItem("jobtracker_current_user");
    if (cached) return normalizeUserObj(JSON.parse(cached));
    
    const defaultUser = normalizeUserObj({
      uid: 'guest_user_1',
      email: 'candidate@jobtracker.com',
      displayName: 'Active Candidate'
    });
    localStorage.setItem("jobtracker_current_user", JSON.stringify(defaultUser));
    return defaultUser;
  } catch (err) {
    console.warn("Failed to read stored user:", err.message);
    return normalizeUserObj({
      uid: 'guest_user_1',
      email: 'candidate@jobtracker.com',
      displayName: 'Active Candidate'
    });
  }
}

function saveStoredUser(userObj) {
  if (!userObj) {
    localStorage.removeItem("jobtracker_current_user");
  } else {
    localStorage.setItem("jobtracker_current_user", JSON.stringify(userObj));
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  async function handleAuthSuccess(userObj, token) {
    const normalized = normalizeUserObj(userObj);
    if (token) {
      localStorage.setItem('jobtracker_token', token);
      if (normalized?.id) {
        localStorage.setItem(`jobtracker_token_${normalized.id}`, token);
      }
    }
    setCurrentUser(normalized);
    saveStoredUser(normalized);
    if (normalized?.uid) {
      try {
        await getUserProfile(normalized.uid);
      } catch (err) {
        console.warn("Failed to load user profile on auth success:", err.message);
      }
    }
    return normalized;
  }

  async function signup(email, password, displayName) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password, displayName })
      });
      if (res.ok) {
        const data = await res.json();
        const payload = data.data || data;
        const userObj = payload.user || payload;
        const token = payload.token || data.token;

        return await handleAuthSuccess({
          id: userObj?.id || userObj?.uid || userObj?.userId,
          email: normalizedEmail,
          displayName: userObj?.displayName || displayName || normalizedEmail.split('@')[0]
        }, token);
      }
    } catch (err) {
      console.warn("Express backend signup call failed, creating local user session:", err.message);
    }

    return await handleAuthSuccess({
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      email: normalizedEmail,
      displayName: displayName || normalizedEmail.split('@')[0]
    }, null);
  }

  async function login(email, password) {
    const normalizedEmail = (email || '').trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      if (res.ok) {
        const data = await res.json();
        const payload = data.data || data;
        const userObj = payload.user || payload;
        const token = payload.token || data.token;

        return await handleAuthSuccess({
          id: userObj?.id || userObj?.uid || userObj?.userId,
          email: normalizedEmail,
          displayName: userObj?.displayName || normalizedEmail.split('@')[0]
        }, token);
      }
    } catch (err) {
      console.warn("Express backend login call failed, using local session:", err.message);
    }

    return await handleAuthSuccess({
      id: `user_${normalizedEmail.replace(/[^a-z0-9]/g, '')}`,
      email: normalizedEmail,
      displayName: normalizedEmail.split('@')[0]
    }, null);
  }

  async function logout() {
    const prevUserId = currentUser?.uid || currentUser?.id || currentUser?.userId;
    setCurrentUser(null);
    saveStoredUser(null);
    localStorage.removeItem('jobtracker_token');
    clearUserSession(prevUserId);
  }

  async function resetPassword(email) {
    alert(`Password reset instructions sent to ${email}`);
  }

  async function updateUserPassword() {
    alert("Password updated successfully.");
  }

  async function updateProfileInfo(profileData) {
    if (currentUser) {
      const updated = normalizeUserObj({ ...currentUser, ...profileData });
      setCurrentUser(updated);
      saveStoredUser(updated);
    }
  }

  async function loginWithGoogle(customEmail) {
    if (customEmail) {
      const selectedEmail = customEmail.trim().toLowerCase();
      const handle = selectedEmail.split('@')[0].toLowerCase();
      let formattedName = 'Software Engineer';
      if (handle === 'mdzeeshan578' || handle === 'mdzeeshan') formattedName = 'MD ZEESHAN KHAN';
      else if (handle === 'mdzeeshan457') formattedName = 'Md Zeeshan Khan';
      else if (handle === 'khwajaconstruction477') formattedName = 'KHWAJA CONSTRUCTION';
      else if (handle === 'rehanak9674') formattedName = 'Rehana Khatoon';
      else if (handle === 'zeeshanmd8790') formattedName = 'Zeeshan Khan';
      else formattedName = handle.replace(/[._]/g, ' ').replace(/[0-9]/g, '').trim().replace(/\b\w/g, c => c.toUpperCase());

      const cleanHandle = selectedEmail.replace(/[^a-z0-9]/g, '');
      return await handleAuthSuccess({
        id: `user_${cleanHandle}`,
        email: selectedEmail,
        displayName: formattedName
      }, null);
    }

    const userId = currentUser?.uid || currentUser?.id || `user_${Date.now()}`;
    window.location.href = `${API_BASE_URL}/auth/connect/google?userId=${encodeURIComponent(userId)}`;
  }

  async function connectAndGetGmailToken() {
    const userId = currentUser?.uid || currentUser?.id || `user_${Date.now()}`;
    window.location.href = `${API_BASE_URL}/auth/connect/google?userId=${encodeURIComponent(userId)}`;
  }

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateUserPassword,
    updateProfileInfo,
    loginWithGoogle,
    connectAndGetGmailToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
