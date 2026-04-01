import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Navbar from './components/layout/Navbar';
import Dashboard from './components/dashboard/Dashboard';
import JobList from './components/jobs/JobList';
import JobForm from './components/jobs/JobForm';
import AIResumeAnalyzer from './components/dashboard/AIResumeAnalyzer';
import SuccessPredictor from './components/dashboard/SuccessPredictor';
import { subscribeToJobs, addJob, updateJob, deleteJob, uploadDocument } from './services/db';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
}

function MainApp() {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [currentTab, setCurrentTab] = useState('overview');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Job Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToJobs(currentUser.uid, (data) => {
      setJobs(data);
    });
    return () => unsubscribe();
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

      // Firestore rejects explicitly undefined values. Let's delete them.
      Object.keys(finalJobData).forEach(key => {
        if (finalJobData[key] === undefined) {
          delete finalJobData[key];
        }
      });

      let savedJobId = null;

      if (editingJob) {
        savedJobId = editingJob.id;
        await updateJob(currentUser.uid, savedJobId, finalJobData);
      } else {
        const docRef = await addJob(currentUser.uid, finalJobData);
        savedJobId = docRef.id;
      }

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
      alert("Failed to save application data.");
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
      <Navbar onAddApplication={handleAddApplication} />

      <Dashboard
        jobs={jobs}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {currentTab === 'applications' && (
        <JobList
          jobs={jobs}
          onEdit={handleEditApplication}
          onDelete={handleDeleteJob}
          onSaveGlobal={handleSaveGlobalJob}
          globalSearchTerm={globalSearchTerm}
          setGlobalSearchTerm={setGlobalSearchTerm}
        />
      )}

      {currentTab === 'ai-analyzer' && (
        <AIResumeAnalyzer />
      )}

      {currentTab === 'ai-predictor' && (
        <SuccessPredictor jobs={jobs} />
      )}

      <JobForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingJob}
      />
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