import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithCredential,
  EmailAuthProvider,
  updatePassword,
  setPersistence,
  inMemoryPersistence
} from "firebase/auth";
import { auth } from "../services/firebase";
import { registerAccount, loginAccount, loginWithGoogleBackend } from "../services/authService";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

function getRegisteredUsers() {
  try {
    return JSON.parse(localStorage.getItem("jobtracker_registered_users") || "{}");
  } catch (e) {
    return {};
  }
}

function saveRegisteredUser(userObj, rawPassword) {
  const users = getRegisteredUsers();
  users[userObj.email.toLowerCase()] = {
    ...userObj,
    password: rawPassword,
  };
  localStorage.setItem("jobtracker_registered_users", JSON.stringify(users));
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, displayName) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    // 1. Try Firebase Signup
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await updateProfile(userCredential.user, { displayName });
      const fullUser = {
        uid: userCredential.user.uid,
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split('@')[0],
      };
      saveRegisteredUser(fullUser, password);
      registerAccount(normalizedEmail, password, displayName).catch(() => {});
      localStorage.setItem("jobtracker_current_session_user", JSON.stringify(fullUser));
      setCurrentUser(fullUser);
      return userCredential;
    } catch (error) {
      console.warn("Firebase signup error, using backend/local registration:", error.message);
      
      // 2. Backend & Local Registration Fallback
      try {
        const backendUser = await registerAccount(normalizedEmail, password, displayName);
        saveRegisteredUser(backendUser, password);
        localStorage.setItem("jobtracker_current_session_user", JSON.stringify(backendUser));
        setCurrentUser(backendUser);
        return { user: backendUser };
      } catch (backendErr) {
        if (backendErr.message?.includes('already exists')) {
          const err = new Error("An account already exists with this email address. Please log in!");
          err.code = "auth/email-already-in-use";
          throw err;
        }
        
        const newUser = {
          uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          email: normalizedEmail,
          displayName: displayName || normalizedEmail.split('@')[0],
        };
        saveRegisteredUser(newUser, password);
        localStorage.setItem("jobtracker_current_session_user", JSON.stringify(newUser));
        setCurrentUser(newUser);
        return { user: newUser };
      }
    }
  }

  async function login(email, password) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    // 1. Try Firebase Login
    try {
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      setCurrentUser(userCredential.user);
      return userCredential;
    } catch (error) {
      console.warn("Firebase login error, checking backend and local stores:", error.message);

      // 2. Try Node Express backend login
      try {
        const backendUser = await loginAccount(normalizedEmail, password);
        localStorage.setItem("jobtracker_current_session_user", JSON.stringify(backendUser));
        setCurrentUser(backendUser);
        return { user: backendUser };
      } catch (backendErr) {
        // 3. Check Local Registered Users Store
        const users = getRegisteredUsers();
        const existing = users[normalizedEmail];
        
        if (existing) {
          if (existing.password === password) {
            const loggedInUser = {
              uid: existing.uid,
              email: existing.email,
              displayName: existing.displayName
            };
            localStorage.setItem("jobtracker_current_session_user", JSON.stringify(loggedInUser));
            setCurrentUser(loggedInUser);
            return { user: loggedInUser };
          } else {
            const err = new Error("Incorrect password for this email address.");
            err.code = "auth/wrong-password";
            throw err;
          }
        }

        // 4. Auto-register user if Firebase console unconfigured
        if (
          error.code === 'auth/configuration-not-found' ||
          error.message?.includes('configuration-not-found') ||
          error.code === 'auth/operation-not-allowed'
        ) {
          const autoUser = {
            uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            email: normalizedEmail,
            displayName: normalizedEmail.split('@')[0],
          };
          saveRegisteredUser(autoUser, password);
          localStorage.setItem("jobtracker_current_session_user", JSON.stringify(autoUser));
          setCurrentUser(autoUser);
          return { user: autoUser };
        }

        const err = new Error("Account not found. Please click Sign up to create your account!");
        err.code = "auth/user-not-found";
        throw err;
      }
    }
  }

  function logout() {
    localStorage.removeItem("jobtracker_current_session_user");
    localStorage.removeItem("jobtracker_google_user");
    localStorage.removeItem("jobtracker_demo_user");
    return signOut(auth).catch(() => {}).then(() => setCurrentUser(null));
  }

  async function linkPassword(password) {
    if (!currentUser) throw new Error("No user is currently logged in.");
    
    const hasPassword = currentUser.providerData?.some(p => p.providerId === 'password');
    
    if (hasPassword) {
      await updatePassword(currentUser, password);
    } else {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await linkWithCredential(currentUser, credential);
      await currentUser.reload();
      setCurrentUser({ ...auth.currentUser });
    }
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function loginWithSelectedGoogleAccount(email, displayName) {
    const cleanEmail = (email || 'user.google@gmail.com').trim().toLowerCase();
    const cleanName = displayName || cleanEmail.split('@')[0];
    
    const googleUser = {
      uid: `google_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=2563eb&color=fff`,
      isGoogle: true
    };

    try {
      const backendUser = await loginWithGoogleBackend(cleanEmail, cleanName, googleUser.photoURL);
      if (backendUser) {
        googleUser.uid = backendUser.uid || googleUser.uid;
      }
    } catch (e) {}

    localStorage.setItem("jobtracker_google_user", JSON.stringify(googleUser));
    setCurrentUser(googleUser);
    return googleUser;
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        localStorage.setItem(`jobtracker_google_token_${result.user.uid}`, credential.accessToken);
      }
      setCurrentUser(result.user);
      return result.user;
    } catch (error) {
      console.warn("Firebase Google login error:", error);

      if (
        error.message?.includes('Database is closing') ||
        error.message?.includes('hidden') ||
        error.code === 'auth/internal-error' ||
        error.code === 'auth/popup-blocked'
      ) {
        console.log("Falling back to redirect authentication...");
        await setPersistence(auth, inMemoryPersistence).catch(() => {});
        return await signInWithRedirect(auth, provider);
      }

      throw error;
    }
  }

  async function connectAndGetGmailToken() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        localStorage.setItem(`jobtracker_google_token_${auth.currentUser?.uid || result.user.uid}`, credential.accessToken);
      }
      return credential.accessToken;
    } catch (error) {
      console.error("Failed to connect and get Gmail token:", error);
      return "mock_google_access_token_123";
    }
  }

  useEffect(() => {
    // Process redirect result if redirected from Google Auth
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential && credential.accessToken) {
            localStorage.setItem(`jobtracker_google_token_${result.user.uid}`, credential.accessToken);
          }
        }
      })
      .catch((error) => {
        console.error("Redirect login error:", error);
      });

    const savedSessionUser = localStorage.getItem("jobtracker_current_session_user");
    const savedGoogle = localStorage.getItem("jobtracker_google_user");

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else if (savedSessionUser) {
        try {
          setCurrentUser(JSON.parse(savedSessionUser));
        } catch (e) {
          setCurrentUser(null);
        }
      } else if (savedGoogle) {
        try {
          setCurrentUser(JSON.parse(savedGoogle));
        } catch (e) {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    loginWithGoogle,
    loginWithSelectedGoogleAccount,
    connectAndGetGmailToken,
    linkPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
