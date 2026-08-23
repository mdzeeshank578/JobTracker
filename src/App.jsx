import React, { useState, useEffect, useRef } from 'react';
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
      const userKey = currentUser?.uid ? `jobtracker_user_jobs_${currentUser.uid}` : 'jobtracker_user_jobs_guest';
      const userCached = localStorage.getItem(userKey);
      return userCached ? JSON.parse(userCached) : [];
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
    const userId = currentUser?.uid || 'guest';
    const userKey = `jobtracker_user_jobs_${userId}`;
    const userCached = localStorage.getItem(userKey);
    setJobs(userCached ? JSON.parse(userCached) : []);

    const unsubscribe = subscribeToJobs(userId, (data) => {
      setJobs(data);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

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

  const hasHandledSyncRef = useRef(false);

  // Handle Sync Center OAuth callbacks (Runs ONCE per redirect)
  useEffect(() => {
    if (!currentUser || hasHandledSyncRef.current) return;
    
    const params = new URLSearchParams(window.location.search);
    const syncConnected = params.get('sync_connected');
    const provider = params.get('provider');
    const email = params.get('email');
    
    if (syncConnected === 'true' && provider && email) {
      hasHandledSyncRef.current = true;
      // Immediately strip query string from address bar to prevent repeated firing
      window.history.replaceState({}, document.title, window.location.pathname);

      const storageKey = `jobtracker_connected_accounts_${currentUser.uid}`;
      const existing = localStorage.getItem(storageKey);
      let accounts = [];
      if (existing) {
        try {
          accounts = JSON.parse(existing);
        } catch (e) {}
      }
      
      const existingIdx = accounts.findIndex(acc => acc.provider === provider && acc.email === email);
      const newAcc = { provider, email, connectedAt: new Date().toISOString() };
      if (existingIdx >= 0) {
        accounts[existingIdx] = newAcc;
      } else {
        accounts.push(newAcc);
      }
      localStorage.setItem(storageKey, JSON.stringify(accounts));
    }
  }, [currentUser]);

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

      Object.keys(finalJobData).forEach(key => {
        if (finalJobData[key] === undefined) {
          delete finalJobData[key];
        }
      });

      let savedJob = null;
      let savedJobId = null;

      if (editingJob && (editingJob.id || editingJob._id)) {
        savedJobId = editingJob.id || editingJob._id;
        await updateJob(currentUser.uid, savedJobId, finalJobData);
        setJobs(prev => prev.map(j => (j.id === savedJobId || j._id === savedJobId) ? { ...j, ...finalJobData } : j));
      } else {
        savedJob = await addJob(currentUser.uid, finalJobData);
        savedJobId = savedJob?.id || savedJob?._id;
        if (savedJob) {
          setJobs(prev => [savedJob, ...prev.filter(j => j.id !== savedJobId && j._id !== savedJobId)]);
        }
      }
      setEditingJob(null);
      setIsFormOpen(false);

      // Helper to convert File to Base64
      const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });

      // Handle files by converting them directly to Base64 strings for REST API transmission
      if ((resumeFile || coverLetterFile) && savedJobId) {
        try {
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
            setJobs(prev => prev.map(j => (j.id === savedJobId || j._id === savedJobId) ? { ...j, ...updates } : j));
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
    const targetId = typeof jobId === 'object' ? (jobId?.id || jobId?._id) : jobId;
    if (!targetId) return;

    if (window.confirm("Are you sure you want to delete this application?")) {
      try {
        const userId = currentUser?.uid || 'guest';
        setJobs(prev => prev.filter(j => j.id !== targetId && j._id !== targetId));
        await deleteJob(userId, targetId);
      } catch (error) {
        console.error("Error deleting job:", error);
        alert("Failed to delete application");
      }
    }
  };

  const handleSaveGlobalJob = async (job) => {
    try {
      const newJobData = {
        company: job.company,
        role: job.role,
        type: job.type || 'Full-time',
        status: 'Applied',
        dateApplied: new Date().toISOString().split('T')[0],
        deadline: job.deadline || null,
        notes: "Found via Global Job Search engine. High match potential.",
        resumeUrl: null,
        coverLetterUrl: null
      };
      const saved = await addJob(currentUser.uid, newJobData);
      if (saved) {
        setJobs(prev => [saved, ...prev.filter(j => j.id !== saved.id && j._id !== saved.id)]);
      }
      setCurrentTab('overview');
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
