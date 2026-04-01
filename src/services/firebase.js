import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD-UxIjeOyPznvHvsVNwsiyBjr275xdRuc",
  authDomain: "jobtracker-soniaghosh-app.firebaseapp.com",
  projectId: "jobtracker-soniaghosh-app",
  storageBucket: "jobtracker-soniaghosh-app.firebasestorage.app",
  messagingSenderId: "73785779524",
  appId: "1:73785779524:web:633953708d160da2b72311"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
