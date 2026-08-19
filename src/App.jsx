import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Navbar from './components/layout/Navbar';
import Dashboard from './components/dashboard/Dashboard';
import JobList from './components/jobs/JobList';
import JobForm from './components/jobs/JobForm';
import AICareerIntelligence from './components/dashboard/AICareerIntelligence';
import AIResumeAnalyzer from './components/dashboard/AIResumeAnalyzer';
import SuccessPredictor from './components/dashboard/SuccessPredictor';
import Profile from './components/profile/Profile';
import ResumeStudio from './components/profile/ResumeStudio';
import ChatAssistant from './components/dashboard/ChatAssistant';
import SyncCenter from './components/dashboard/SyncCenter';
import LiveJobs from './components/liveJobs/LiveJobs';
import FourRoundPracticeModal from './components/interview/FourRoundPracticeModal';
import { subscribeToJobs, addJob, updateJob, deleteJob, uploadDocument } from './services/db';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
}

function MainApp() {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState(() => {
    try {
      const globalCached = localStorage.getItem('jobtracker_global_saved_jobs');
      const userKey = currentUser?.uid ? `jobtracker_user_jobs_${currentUser.uid}` : 'jobtracker_user_jobs_guest';
      const userCached = localStorage.getItem(userKey);
      const uJobs = userCached ? JSON.parse(userCached) : [];
      const gJobs = globalCached ? JSON.parse(globalCached) : [];
      
      const jobMap = new Map();
      [...uJobs, ...gJobs].forEach(j => {
        if (j && (j.id || (j.company && j.role))) {
          const key = j.id || `${j.company}_${j.role}`;
          jobMap.set(key, j);
        }
      });
      return Array.from(jobMap.values());
    } catch (e) {
      return [];
    }
  });

  const [currentTab, setCurrentTab] = useState('overview');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [practiceJob, setPracticeJob] = useState(null);

  // Job Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToJobs(currentUser?.uid || 'guest', (data) => {
      setJobs(data);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Global listener for 4-Round Practice Session requests
  useEffect(() => {
    function handlePracticeRequest(e) {
      if (e.detail) {
        setPracticeJob(e.detail);
      }
    }
    window.startPracticeSession = (job) => {
      setPracticeJob(job);
    };
    window.addEventListener('start-4-round-practice', handlePracticeRequest);
    return () => {
      window.removeEventListener('start-4-round-practice', handlePracticeRequest);
      delete window.startPracticeSession;
    };
  }, []);

  // Handle Sync Center OAuth callbacks
  useEffect(() => {
    if (!currentUser) return;
    
    const params = new URLSearchParams(window.location.search);
    const syncConnected = params.get('sync_connected');
    const provider = params.get('provider');
    const email = params.get('email');
    
    if (syncConnected === 'true' && provider && email) {
      // Connect account locally
      const storageKey = `jobtracker_connected_accounts_${currentUser.uid}`;
      const existing = localStorage.getItem(storageKey);
      let accounts = [];
      if (existing) {
        try {
          accounts = JSON.parse(existing);
        } catch (e) {}
      }
      
      // Upsert
      const existingIdx = accounts.findIndex(acc => acc.provider === provider && acc.email === email);
      const newAcc = { provider, email, connectedAt: new Date().toISOString() };
      if (existingIdx >= 0) {
        accounts[existingIdx] = newAcc;
      } else {
        accounts.push(newAcc);
      }
      localStorage.setItem(storageKey, JSON.stringify(accounts));

      // Trigger a Sync Bridge execution immediately to fetch applications
      import('./services/supabaseService').then(({ supabaseService }) => {
        supabaseService.bridgeSyncedApplications(currentUser.uid, jobs, addJob, updateJob).then(bridgeResult => {
          let alertMsg = `Successfully connected ${provider} account (${email})!`;
          if (bridgeResult.added > 0 || bridgeResult.updated > 0) {
            alertMsg += `\n🚀 Imported ${bridgeResult.added} new jobs and updated ${bridgeResult.updated} statuses.`;
          }
          alert(alertMsg);
        });
      });

      // Clear query params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser, jobs]);

  const handleAddApplication = () => {
    setEditingJob(null);
    setIsFormOpen(true);
  };

  const handleEditApplication = (job) => {
    setEditingJob(job);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (jobData, resumeFile, coverLetterFile) => {
    try {
      const finalJobData = { ...jobData };

      // Auto-attach candidate active Master CV if no custom resumeUrl attached
      const activeCvUrl = localStorage.getItem('jobTracker_resumeUrl') || null;
      const activeCvName = localStorage.getItem('jobTracker_resumeName') || 'Master_CV.pdf';
      if (!finalJobData.resumeUrl && activeCvUrl) {
        finalJobData.resumeUrl = activeCvUrl;
        finalJobData.resumeName = activeCvName;
      }

      // Firestore rejects explicitly undefined values. Let's delete them.
      Object.keys(finalJobData).forEach(key => {
        if (finalJobData[key] === undefined) {
          delete finalJobData[key];
        }
      });

      let savedJobId = null;

      if (editingJob && editingJob.id) {
        savedJobId = editingJob.id;
        await updateJob(currentUser.uid, savedJobId, finalJobData);
      } else {
        const docRef = await addJob(currentUser.uid, finalJobData);
        savedJobId = docRef.id;
      }
      setEditingJob(null);

      // Helper to convert File to Base64
      const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });

      // Handle files by converting them directly to Base64 strings to bypass Firebase Storage Billing
      if (resumeFile || coverLetterFile) {
        try {
          // Check file sizes to avoid hitting Firestore's 1MB document limit
          const MAX_SIZE = 700 * 1024; // 700KB
          if (resumeFile && resumeFile.size > MAX_SIZE) {
            throw new Error(`Resume is too large. Please keep it under 700KB.`);
          }
          if (coverLetterFile && coverLetterFile.size > MAX_SIZE) {
            throw new Error(`Cover Letter is too large. Please keep it under 700KB.`);
          }

          let newResumeUrl = jobData.resumeUrl || null;
          let newCoverLetterUrl = jobData.coverLetterUrl || null;

          if (resumeFile) {
            newResumeUrl = await fileToBase64(resumeFile);
          }
          if (coverLetterFile) {
            newCoverLetterUrl = await fileToBase64(coverLetterFile);
          }
          
          const updates = {};
          if (newResumeUrl !== null) updates.resumeUrl = newResumeUrl;
          if (newCoverLetterUrl !== null) updates.coverLetterUrl = newCoverLetterUrl;
          
          if (Object.keys(updates).length > 0) {
            await updateJob(currentUser.uid, savedJobId, updates);
          }
        } catch (fileError) {
          console.error("Base64 File Conversion failed:", fileError);
          alert(fileError.message || "Failed to save the documents. Please try a smaller PDF.");
        }
      }

    } catch (error) {
      console.error("Error saving job:", error);
      alert(`Failed to save application data: ${error.message || error}`);
      throw error;
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm("Are you sure you want to delete this application?")) {
      try {
        await deleteJob(currentUser.uid, jobId);
      } catch (error) {
        console.error("Error deleting job:", error);
        alert("Failed to delete application");
      }
    }
  };

  const handleSaveGlobalJob = async (job) => {
    try {
      const newJob = {
        company: job.company,
        role: job.role,
        type: job.type,
        status: 'Applied',
        dateApplied: new Date().toISOString().split('T')[0],
        deadline: job.deadline,
        notes: "Found via Global Job Search engine. High match potential.",
        resumeUrl: null,
        coverLetterUrl: null
      };
      await addJob(currentUser.uid, newJob);
      setCurrentTab('overview'); // Optionally jump to overview or stay to keep searching
      alert(`Awesome! ${job.company} added to your tracker!`);
    } catch (error) {
       console.error(error);
       alert("Failed to save global job");
    }
  };

  return (
    <div className="app-container">
      {currentTab === 'profile' ? (
        <Profile onBack={() => setCurrentTab('overview')} />
      ) : (
        <>
          <Navbar 
            onAddApplication={handleAddApplication}
            onOpenProfile={() => setCurrentTab('profile')}
          />

          <Dashboard
            jobs={jobs}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            onEdit={handleEditApplication}
            onDelete={handleDeleteJob}
            onSaveGlobal={handleSaveGlobalJob}
            globalSearchTerm={globalSearchTerm}
            setGlobalSearchTerm={setGlobalSearchTerm}
            onStartPractice={(job) => setPracticeJob(job)}
          />

          {currentTab === 'applications' && (
            <JobList
              jobs={jobs}
              onEdit={handleEditApplication}
              onDelete={handleDeleteJob}
              onSaveGlobal={handleSaveGlobalJob}
              globalSearchTerm={globalSearchTerm}
              setGlobalSearchTerm={setGlobalSearchTerm}
              onStartPractice={(job) => setPracticeJob(job)}
            />
          )}

          {currentTab === 'ai-analyzer' && (
            <AICareerIntelligence jobs={jobs} />
          )}

          {currentTab === 'ai-predictor' && (
            <SuccessPredictor jobs={jobs} />
          )}

          {currentTab === 'resume-studio' && (
            <ResumeStudio />
          )}

          {currentTab === 'live-jobs' && (
            <LiveJobs trackedJobs={jobs} onStartPractice={(job) => setPracticeJob(job)} />
          )}
        </>
      )}

      <JobForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingJob}
      />
      {practiceJob && (
        <FourRoundPracticeModal
          key={practiceJob.id || `${practiceJob.company}_${practiceJob.role}`}
          job={practiceJob}
          onClose={() => setPracticeJob(null)}
        />
      )}
      <ChatAssistant jobs={jobs} />
    </div>
  );
}
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
