import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  Timestamp
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
  const jobsRef = collection(db, "users", userId, "jobs");
  return await addDoc(jobsRef, {
    ...jobData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

export async function updateJob(userId, jobId, jobData) {
  if (!userId || !jobId) throw new Error("User ID and Job ID are required");
  const jobRef = doc(db, "users", userId, "jobs", jobId);
  return await updateDoc(jobRef, {
    ...jobData,
    userId,
    updatedAt: Timestamp.now()
  });
}

export async function deleteJob(userId, jobId) {
  if (!userId || !jobId) throw new Error("User ID and Job ID are required");
  const jobRef = doc(db, "users", userId, "jobs", jobId);
  return await deleteDoc(jobRef);
}

