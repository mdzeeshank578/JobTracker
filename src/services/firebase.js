import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDOll3RtgoDgQ1YSQEW1AHTuwxvSH0sn5A",
  authDomain: "job-tracker-8b728.firebaseapp.com",
  projectId: "job-tracker-8b728",
  storageBucket: "job-tracker-8b728.firebasestorage.app",
  messagingSenderId: "561563069285",
  appId: "1:561563069285:web:1e428b909e67649c358f8c",
  measurementId: "G-FX6VHK525M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Safely set persistence, handling IndexedDB storage restrictions in Safari/private browsing
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Firebase Auth setPersistence warning (falling back to memory):", err?.message || err);
});

export const db = getFirestore(app);
export const storage = getStorage(app);
