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

  try {
    const profileRef = doc(db, "users", userId, "profile", "info");
    const docSnap = await getDoc(profileRef);
    if (docSnap.exists()) {
      const cloudData = docSnap.data();
      // Sync cloud data to local account storage
      localStorage.setItem(`jobtracker_user_profile_${userId}`, JSON.stringify(cloudData));

      // Also sync resume text if present
      if (cloudData.bio || cloudData.technicalSkills || cloudData.fullName) {
        const textSummary = [
          cloudData.fullName,
          cloudData.professionalTitle,
          cloudData.bio,
          cloudData.technicalSkills,
          cloudData.frameworks,
          cloudData.tools,
          Array.isArray(cloudData.workExperience) ? cloudData.workExperience.map(w => `${w.title} at ${w.company}: ${w.description}`).join('; ') : '',
          Array.isArray(cloudData.projects) ? cloudData.projects.map(p => `${p.name}: ${p.description}`).join('; ') : ''
        ].filter(Boolean).join('\n');
        localStorage.setItem('jobTracker_resumeText', textSummary);
      }

      return cloudData;
    }
  } catch (err) {
    console.warn("Firestore getUserProfile network warning, falling back to account storage:", err.message);
  }

  // Fallback to local storage for this specific account ID
  const localSaved = localStorage.getItem(`jobtracker_user_profile_${userId}`);
  if (localSaved) {
    try {
      return JSON.parse(localSaved);
    } catch (e) {}
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

  // 1. Instant account local persistence
  localStorage.setItem(`jobtracker_user_profile_${userId}`, JSON.stringify(cleanedData));

  // Sync resume text globally
  const textSummary = [
    cleanedData.fullName,
    cleanedData.professionalTitle,
    cleanedData.bio,
    cleanedData.technicalSkills,
    cleanedData.frameworks,
    cleanedData.tools,
    Array.isArray(cleanedData.workExperience) ? cleanedData.workExperience.map(w => `${w.title} at ${w.company}: ${w.description}`).join('; ') : '',
    Array.isArray(cleanedData.projects) ? cleanedData.projects.map(p => `${p.name}: ${p.description}`).join('; ') : ''
  ].filter(Boolean).join('\n');
  localStorage.setItem('jobTracker_resumeText', textSummary);

  // 2. Cloud sync with Firestore
  try {
    const profileRef = doc(db, "users", userId, "profile", "info");
    await setDoc(profileRef, {
      ...cleanedData,
      updatedAt: Timestamp.now()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore cloud sync notice:", err.message);
  }

  return cleanedData;
}
