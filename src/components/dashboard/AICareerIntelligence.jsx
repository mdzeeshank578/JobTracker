import React, { useState } from 'react';
import { Video, FileText } from 'lucide-react';
import AIResumeAnalyzer from './AIResumeAnalyzer';
import AIInterviewSession from './AIInterviewSession';
import './AICareerIntelligence.css';

export default function AICareerIntelligence({ jobs = [] }) {
  const [activeSession, setActiveSession] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('generic');

  const selectedJob = jobs.find(j => j.id === selectedJobId) || { 
     company: 'General Practice', 
     role: 'Software Professional' 
  };

  if (activeSession) {
    return <AIInterviewSession job={selectedJob} onEnd={() => setActiveSession(false)} />;
  }

  return (
    <div className="ai-hub-container">
      <div className="ai-hub-header">
        <h2>AI Career Intelligence</h2>
        <p>Leverage advanced AI to optimize your professional journey.</p>
      </div>

      <div className="ai-hub-cards">
        {/* Card 1: Interview Training */}
        <div className="ai-hub-card">
          <div className="ai-card-title">
            <Video size={24} className="icon-purple" />
            <h3>AI Interview Training (Meet Ready)</h3>
          </div>
          <p className="ai-card-desc">
            Prepare your posture, tone, and delivery tailored specifically to your active job applications.
          </p>
          
          <div className="job-selector-container">
            <label htmlFor="job-select" className="job-selector-label">Target Application:</label>
            <select 
               id="job-select" 
               value={selectedJobId} 
               onChange={(e) => setSelectedJobId(e.target.value)}
               className="ai-job-select"
            >
               <option value="generic">Generic Practice Interview</option>
               {jobs.map(job => (
                 <option key={job.id} value={job.id}>
                    {job.role} at {job.company}
                 </option>
               ))}
            </select>
          </div>

          <button 
            className="ai-card-btn-primary" 
            onClick={() => setActiveSession(true)}
          >
            <Video size={18} />
            Start 2-Min Comprehensive Session
          </button>
        </div>

        {/* Card 2: Resume Analysis */}
        <div className="ai-hub-card resume-card">
          <div className="ai-card-title">
            <FileText size={24} className="icon-blue" />
            <h3>Resume Analysis</h3>
          </div>
          <div className="ai-resume-analyzer-wrapper">
             <AIResumeAnalyzer />
          </div>
        </div>
      </div>
    </div>
  );
}
