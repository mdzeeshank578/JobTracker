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
  const safeUserId = userId || 'guest';
  const storageKey = `jobtracker_user_jobs_${safeUserId}`;
  const globalKey = `jobtracker_global_saved_jobs`;

  // 1. Immediately return cached jobs from account local storage to prevent data wipe on refresh
  const loadLocalJobs = () => {
    try {
      const userCached = localStorage.getItem(storageKey);
      const globalCached = localStorage.getItem(globalKey);
      const userJobs = userCached ? JSON.parse(userCached) : [];
      const globalJobs = globalCached ? JSON.parse(globalCached) : [];

      // Combine unique jobs by ID or company+role
      const jobMap = new Map();
      [...userJobs, ...globalJobs].forEach(j => {
        if (j && (j.id || (j.company && j.role))) {
          const key = j.id || `${j.company}_${j.role}`;
          if (!jobMap.has(key)) {
            jobMap.set(key, j);
          }
        }
      });
      return Array.from(jobMap.values());
    } catch (e) {
      return [];
    }
  };

  const initialJobs = loadLocalJobs();
  if (initialJobs.length > 0) {
    callback(initialJobs);
  }

  if (!userId) return () => {};

  const q = getJobsQuery(userId);
  if (!q) return () => {};
  
  return onSnapshot(q, (snapshot) => {
    const firestoreJobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data({ serverTimestamps: 'estimate' })
    }));

    const combinedMap = new Map();
    [...firestoreJobs, ...initialJobs].forEach(j => {
      if (j && (j.id || (j.company && j.role))) {
        const key = j.id || `${j.company}_${j.role}`;
        combinedMap.set(key, j);
      }
    });
    const finalJobs = Array.from(combinedMap.values());

    // Cache updated jobs locally per account and globally
    try {
      localStorage.setItem(storageKey, JSON.stringify(finalJobs));
      localStorage.setItem(globalKey, JSON.stringify(finalJobs));
    } catch (e) {
      console.error("Error caching jobs:", e);
    }

    callback(finalJobs);
  });
}

export async function addJob(userId, jobData) {
  const safeUserId = userId || 'guest';
  const cleanedJobData = { ...jobData };
  Object.keys(cleanedJobData).forEach(key => {
    if (cleanedJobData[key] === undefined) {
      delete cleanedJobData[key];
    }
  });

  const tempId = `job_${Date.now()}`;
  const storageKey = `jobtracker_user_jobs_${safeUserId}`;
  const globalKey = `jobtracker_global_saved_jobs`;

  // 1. Optimistically update local account and global cache immediately
  try {
    const newJob = { id: tempId, ...cleanedJobData, userId: safeUserId, createdAt: new Date().toISOString() };
    
    const userCached = localStorage.getItem(storageKey);
    let userJobs = userCached ? JSON.parse(userCached) : [];
    userJobs = [newJob, ...userJobs.filter(j => j.id !== tempId)];
    localStorage.setItem(storageKey, JSON.stringify(userJobs));

    const globalCached = localStorage.getItem(globalKey);
    let globalJobs = globalCached ? JSON.parse(globalCached) : [];
    globalJobs = [newJob, ...globalJobs.filter(j => j.id !== tempId)];
    localStorage.setItem(globalKey, JSON.stringify(globalJobs));
  } catch (e) {}

  if (!userId) return { id: tempId };

  // 2. Perform Firestore write with a 2-second safety timeout guard
  const jobsRef = collection(db, "users", userId, "jobs");
  const firestorePromise = addDoc(jobsRef, {
    ...cleanedJobData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ id: tempId }), 2000));
  const docRef = await Promise.race([firestorePromise, timeoutPromise]);
  return docRef || { id: tempId };
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
  const safeUserId = userId || 'guest';
  if (!jobId) throw new Error("Job ID is required");

  const cleanedJobData = { ...jobData };
  Object.keys(cleanedJobData).forEach(key => {
    if (cleanedJobData[key] === undefined) {
      delete cleanedJobData[key];
    }
  });

  const storageKey = `jobtracker_user_jobs_${safeUserId}`;
  const globalKey = `jobtracker_global_saved_jobs`;

  // 1. Immediately update local account cache and global cache
  try {
    const updateList = (cachedStr) => {
      if (!cachedStr) return [];
      let jobs = JSON.parse(cachedStr);
      return jobs.map(j => j.id === jobId ? { ...j, ...cleanedJobData, updatedAt: new Date().toISOString() } : j);
    };

    localStorage.setItem(storageKey, JSON.stringify(updateList(localStorage.getItem(storageKey))));
    localStorage.setItem(globalKey, JSON.stringify(updateList(localStorage.getItem(globalKey))));
  } catch (e) {}

  if (!userId) return true;

  // 2. Perform Firestore update with a 2-second safety timeout guard
  const jobRef = doc(db, "users", userId, "jobs", jobId);
  const firestorePromise = updateDoc(jobRef, {
    ...cleanedJobData,
    userId,
    updatedAt: Timestamp.now()
  });

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(true), 2000));
  await Promise.race([firestorePromise, timeoutPromise]);
  return true;
}

export async function deleteJob(userId, jobId) {
  const safeUserId = userId || 'guest';
  if (!jobId) throw new Error("Job ID is required");

  const storageKey = `jobtracker_user_jobs_${safeUserId}`;
  const globalKey = `jobtracker_global_saved_jobs`;

  // Update local cache and global cache
  try {
    const filterList = (cachedStr) => {
      if (!cachedStr) return [];
      let jobs = JSON.parse(cachedStr);
      return jobs.filter(j => j.id !== jobId);
    };

    localStorage.setItem(storageKey, JSON.stringify(filterList(localStorage.getItem(storageKey))));
    localStorage.setItem(globalKey, JSON.stringify(filterList(localStorage.getItem(globalKey))));
  } catch (e) {}

  if (!userId) return true;

  const jobRef = doc(db, "users", userId, "jobs", jobId);
  const result = await deleteDoc(jobRef);
  return result;
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
