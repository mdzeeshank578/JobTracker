import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  getDoc,
  setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

export async function uploadDocument(userId, file) {
  if (!file) return null;
  const storageRef = ref(storage, `users/${userId}/documents/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export function getJobsQuery(userId) {
  if (!userId) return null;
  const jobsRef = collection(db, "users", userId, "jobs");
  return query(jobsRef, orderBy("createdAt", "desc"));
}

export function subscribeToJobs(userId, callback) {
  if (!userId) return () => {};
  const q = getJobsQuery(userId);
  if (!q) return () => {};
  
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data({ serverTimestamps: 'estimate' })
    }));
    callback(jobs);
  });
}

export async function addJob(userId, jobData) {
  if (!userId) throw new Error("User ID is required");
  
  const cleanedJobData = { ...jobData };
  Object.keys(cleanedJobData).forEach(key => {
    if (cleanedJobData[key] === undefined) {
      delete cleanedJobData[key];
    }
  });

  const jobsRef = collection(db, "users", userId, "jobs");
  return await addDoc(jobsRef, {
    ...cleanedJobData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

export async function saveJobForLater(userId, jobData) {
  if (!userId) throw new Error("User ID is required");

  const cleanedJobData = { ...jobData };
  Object.keys(cleanedJobData).forEach(key => {
    if (cleanedJobData[key] === undefined) {
      delete cleanedJobData[key];
    }
  });

  const savedJobsRef = collection(db, "users", userId, "savedJobs");
  return await addDoc(savedJobsRef, {
    ...cleanedJobData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

export function subscribeToSavedJobs(userId, callback) {
  if (!userId) return () => {};
  const savedJobsRef = collection(db, "users", userId, "savedJobs");
  const q = query(savedJobsRef, orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const savedJobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data({ serverTimestamps: 'estimate' })
    }));
    callback(savedJobs);
  });
}

export async function updateJob(userId, jobId, jobData) {
  if (!userId || !jobId) throw new Error("User ID and Job ID are required");

  const cleanedJobData = { ...jobData };
  Object.keys(cleanedJobData).forEach(key => {
    if (cleanedJobData[key] === undefined) {
      delete cleanedJobData[key];
    }
  });

  const jobRef = doc(db, "users", userId, "jobs", jobId);
  return await updateDoc(jobRef, {
    ...cleanedJobData,
    userId,
    updatedAt: Timestamp.now()
  });
}

export async function deleteJob(userId, jobId) {
  if (!userId || !jobId) throw new Error("User ID and Job ID are required");
  const jobRef = doc(db, "users", userId, "jobs", jobId);
  return await deleteDoc(jobRef);
}

export async function getUserProfile(userId) {
  if (!userId) return null;

  const localSaved = localStorage.getItem(`jobtracker_user_profile_${userId}`);
  if (localSaved) {
    try {
      return JSON.parse(localSaved);
    } catch (e) {}
  }

  try {
    const profileRef = doc(db, "users", userId, "profile", "info");
    const docSnap = await getDoc(profileRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      localStorage.setItem(`jobtracker_user_profile_${userId}`, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn("Firestore getUserProfile fallback to local:", err.message);
  }
  return null;
}

export async function updateUserProfile(userId, profileData) {
  if (!userId) throw new Error("User ID is required");
  
  const cleanedData = { ...profileData };
  Object.keys(cleanedData).forEach(key => {
    if (cleanedData[key] === undefined) {
      delete cleanedData[key];
    }
  });

  // 1. Instant local persistence
  localStorage.setItem(`jobtracker_user_profile_${userId}`, JSON.stringify(cleanedData));

  // 2. Non-blocking cloud sync with 2s timeout
  try {
    const profileRef = doc(db, "users", userId, "profile", "info");
    const savePromise = setDoc(profileRef, {
      ...cleanedData,
      updatedAt: Timestamp.now()
    }, { merge: true });

    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
    await Promise.race([savePromise, timeoutPromise]);
  } catch (err) {
    console.warn("Firestore cloud sync notice:", err.message);
  }

  return cleanedData;
}
