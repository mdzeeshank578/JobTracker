const API_BASE_URL = 'http://localhost:5001/api';

export function clearUserSession(userId) {
  try {
    localStorage.removeItem('jobtracker_token');
    if (userId) {
      localStorage.removeItem(`jobtracker_token_${userId}`);
      localStorage.removeItem(`jobtracker_user_profile_${userId}`);
    }
  } catch (e) {}
}

function getAuthHeaders(userId) {
  const token = localStorage.getItem('jobtracker_token') || (userId ? localStorage.getItem(`jobtracker_token_${userId}`) : null);
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to load jobs from local storage per-user
function getLocalJobs(userId) {
  const safeUserId = userId || 'guest';
  const storageKey = `jobtracker_user_jobs_${safeUserId}`;
  try {
    const userCached = localStorage.getItem(storageKey);
    return userCached ? JSON.parse(userCached) : [];
  } catch (e) {
    return [];
  }
}

// Helper to save jobs to local storage per-user
function saveLocalJobs(userId, jobs) {
  const safeUserId = userId || 'guest';
  const storageKey = `jobtracker_user_jobs_${safeUserId}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(jobs));
  } catch (e) {}
}

function normalizeJobStatus(statusInput) {
  if (!statusInput) return 'Applied';
  const s = statusInput.toString().trim().toUpperCase();
  if (s === 'INTERVIEW' || s === 'INTERVIEWING') return 'Interviewing';
  if (s === 'OFFER' || s === 'ACCEPTED') return 'Offer';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'WISHLIST') return 'Wishlist';
  if (s === 'ASSESSMENT') return 'Assessment';
  return 'Applied';
}

export function subscribeToJobs(userId, callback) {
  const safeUserId = userId || 'guest';
  
  // 1. Immediately return local cached jobs (0ms delay)
  const initialLocal = getLocalJobs(safeUserId);
  callback(initialLocal);

  // 2. Fetch from Express Backend API using authenticated JWT header
  let isMounted = true;
  async function fetchRemoteJobs() {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        headers: getAuthHeaders(safeUserId)
      });
      if (res.ok) {
        const data = await res.json();
        const remoteJobs = (data.jobs || []).map(j => ({
          ...j,
          id: j._id || j.id,
          company: j.companyName || j.company,
          role: j.jobTitle || j.role,
          companyName: j.companyName || j.company,
          jobTitle: j.jobTitle || j.role,
          status: normalizeJobStatus(j.status),
          createdAt: j.createdAt || j.created_at || new Date().toISOString()
        }));

        const localJobs = getLocalJobs(safeUserId);
        const mergedMap = new Map();

        remoteJobs.forEach(j => {
          if (j.id || j._id) mergedMap.set(j.id || j._id, j);
        });

        localJobs.forEach(j => {
          const key = j.id || j._id;
          if (key && !mergedMap.has(key)) {
            mergedMap.set(key, j);
          }
        });

        const mergedJobs = Array.from(mergedMap.values());
        saveLocalJobs(safeUserId, mergedJobs);
        if (isMounted) callback(mergedJobs);
      }
    } catch (err) {
      console.warn("Express backend offline, using local cached jobs:", err.message);
    }
  }

  fetchRemoteJobs();

  // Poll server every 10 seconds for sync updates
  const interval = setInterval(fetchRemoteJobs, 10000);
  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}

export async function addJob(userId, jobData) {
  const safeUserId = userId || 'guest';
  const normStatus = normalizeJobStatus(jobData.status);
  const tempId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const newJob = {
    _id: jobData._id || jobData.id || tempId,
    id: jobData._id || jobData.id || tempId,
    companyName: jobData.companyName || jobData.company || '',
    jobTitle: jobData.jobTitle || jobData.role || '',
    company: jobData.companyName || jobData.company || '',
    role: jobData.jobTitle || jobData.role || '',
    status: normStatus,
    appliedDate: jobData.appliedDate || jobData.dateApplied || new Date().toISOString().split('T')[0],
    dateApplied: jobData.appliedDate || jobData.dateApplied || new Date().toISOString().split('T')[0],
    deadline: jobData.deadline || null,
    notes: jobData.notes || '',
    jobUrl: jobData.jobUrl || jobData.job_url || '',
    location: jobData.location || '',
    createdAt: new Date().toISOString()
  };

  // 1. Update local storage immediately (optimistic UI update)
  const existing = getLocalJobs(safeUserId);
  const updatedJobs = [newJob, ...existing.filter(j => (j._id !== newJob._id && j.id !== newJob.id))];
  saveLocalJobs(safeUserId, updatedJobs);

  // 2. Post to Express REST API with Bearer token
  try {
    const res = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: getAuthHeaders(safeUserId),
      body: JSON.stringify(newJob)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.job) {
        const savedJob = {
          ...data.job,
          id: data.job._id || data.job.id,
          _id: data.job._id || data.job.id,
          company: data.job.companyName || data.job.company || newJob.company,
          role: data.job.jobTitle || data.job.role || newJob.role,
          companyName: data.job.companyName || data.job.company || newJob.company,
          jobTitle: data.job.jobTitle || data.job.role || newJob.role,
          status: normalizeJobStatus(data.job.status || normStatus)
        };
        const syncedJobs = [savedJob, ...updatedJobs.filter(j => j.id !== newJob.id && j._id !== newJob.id && j.id !== savedJob.id)];
        saveLocalJobs(safeUserId, syncedJobs);
        return savedJob;
      }
    }
  } catch (err) {
    console.warn("Could not post job to Express backend, saved locally:", err.message);
  }

  return newJob;
}

export async function updateJob(userId, jobId, updates) {
  const safeUserId = userId || 'guest';
  const targetId = typeof jobId === 'object' ? (jobId?._id || jobId?.id) : jobId;
  const existing = getLocalJobs(safeUserId);
  const updatedJobs = existing.map(j => {
    if (j._id === targetId || j.id === targetId || (j.company === updates.company && j.role === updates.role)) {
      return { 
        ...j, 
        ...updates, 
        ...(updates.status ? { status: normalizeJobStatus(updates.status) } : {}),
        updatedAt: new Date().toISOString() 
      };
    }
    return j;
  });
  saveLocalJobs(safeUserId, updatedJobs);

  try {
    await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(targetId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(safeUserId),
      body: JSON.stringify(updates)
    });
  } catch (err) {
    console.warn("Express backend update failed, saved locally:", err.message);
  }
}

export async function deleteJob(userId, jobId) {
  const safeUserId = userId || 'guest';
  const targetId = typeof jobId === 'object' ? (jobId?._id || jobId?.id) : jobId;
  if (!targetId) return;

  const existing = getLocalJobs(safeUserId);
  const updatedJobs = existing.filter(j => j._id !== targetId && j.id !== targetId);
  saveLocalJobs(safeUserId, updatedJobs);

  try {
    await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(targetId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(safeUserId)
    });
  } catch (err) {
    console.warn("Express backend delete failed, removed locally:", err.message);
  }
}

export async function getUserProfile(userId) {
  const safeUserId = userId || 'guest';
  const storageKey = `jobtracker_user_profile_${safeUserId}`;
  try {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      headers: getAuthHeaders(safeUserId)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.profile) {
        localStorage.setItem(storageKey, JSON.stringify(data.profile));
        return data.profile;
      }
    }
  } catch (e) {
    console.warn("Express backend profile fetch failed, using cache:", e.message);
  }

  const cached = localStorage.getItem(storageKey);
  return cached ? JSON.parse(cached) : null;
}

export async function updateUserProfile(userId, profileData) {
  const safeUserId = userId || 'guest';
  const storageKey = `jobtracker_user_profile_${safeUserId}`;

  // Strip client-side userId payload before sending
  const payload = { ...profileData };
  delete payload.userId;
  delete payload.user_id;

  // Optimistic update to localStorage
  localStorage.setItem(storageKey, JSON.stringify({ userId: safeUserId, ...profileData }));

  try {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      headers: getAuthHeaders(safeUserId),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.profile) {
        localStorage.setItem(storageKey, JSON.stringify(data.profile));
        return data.profile;
      }
    }
  } catch (err) {
    console.warn("Express backend profile update failed, saved locally:", err.message);
  }
  return { userId: safeUserId, ...profileData };
}

export async function saveJobForLater(userId, jobData) {
  return await addJob(userId, { ...jobData, status: 'WISHLIST' });
}

export async function uploadDocument(userId, file) {
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
  });
}
