import React, { useState, useEffect } from 'react';
import { X, Zap, Link } from 'lucide-react';
import { analyzeJobMatch, simulateAutoFillJob } from '../../services/openai';
import './JobForm.css';

export default function JobForm({ isOpen, onClose, onSubmit, initialData }) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    company: '',
    role: '',
    type: 'Full-time',
    status: 'Applied',
    dateApplied: getTodayStr(),
    deadline: '',
    description: '',
    notes: '',
  });

  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
  const [autoFillUrl, setAutoFillUrl] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const mappedData = { ...initialData };
      if (mappedData.status === 'Interviewing' || mappedData.status === 'Offer') {
        mappedData.status = 'Interview';
      }
      setFormData({
        company: mappedData.company || '',
        role: mappedData.role || '',
        type: mappedData.type || 'Full-time',
        status: mappedData.status || 'Applied',
        dateApplied: mappedData.dateApplied || getTodayStr(),
        deadline: mappedData.deadline || '',
        description: mappedData.description || '',
        notes: mappedData.notes || '',
        resumeUrl: mappedData.resumeUrl || null,
        coverLetterUrl: mappedData.coverLetterUrl || null,
        matchPercentage: mappedData.matchPercentage,
        smartSuggestions: mappedData.smartSuggestions,
      });
    } else {
      setFormData({ company: '', role: '', type: 'Full-time', status: 'Applied', dateApplied: getTodayStr(), deadline: '', description: '', notes: '' });
      setResumeFile(null);
      setCoverLetterFile(null);
    }
  }, [initialData, isOpen]);

  const handleAIMatch = async () => {
    if (!formData.description) {
      alert("Please paste a Job Description first!");
      return;
    }
    const savedResume = localStorage.getItem('jobTracker_resumeText');
    if (!savedResume) {
      alert("No resume found. Please upload a resume in the AI Analyzer tab first!");
      return;
    }

    setIsAnalyzingMatch(true);
    try {
      const matchData = await analyzeJobMatch(savedResume, formData.description);
      setFormData({
        ...formData,
        matchPercentage: matchData.matchPercentage,
        smartSuggestions: matchData.smartSuggestions
      });
    } catch (err) {
      alert(err.message || "Failed to analyze match.");
    } finally {
      setIsAnalyzingMatch(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData, resumeFile, coverLetterFile);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoFill = async () => {
    if (!autoFillUrl) {
      alert("Please paste a valid job URL first!");
      return;
    }
    setIsAutoFilling(true);
    try {
      const mockJob = await simulateAutoFillJob(autoFillUrl);
      setFormData(prev => ({
        ...prev,
        company: mockJob.company,
        role: mockJob.role,
        type: mockJob.type,
        deadline: mockJob.deadline,
        description: mockJob.description
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to auto-fill job.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '15px' }}>
          <h2>{initialData ? 'Edit Application' : 'Add Application'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="job-form" style={{ paddingTop: '0px' }}>
          
          {/* AI Auto Fill Section */}
          <div className="form-group ai-autofill-section" style={{ background: '#eef2ff', padding: '16px', borderRadius: '8px', border: '1px solid #c7d2fe', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontWeight: 600 }}>
              <Zap size={18} />
              <span>AI Auto-Fill</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Paste Job Link here..." 
                value={autoFillUrl}
                onChange={e => setAutoFillUrl(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #a5b4fc', fontSize: '0.95rem' }}
              />
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleAutoFill} 
                disabled={isAutoFilling}
                style={{ whiteSpace: 'nowrap', padding: '10px 20px', background: '#4f46e5' }}
              >
                {isAutoFilling ? 'Scanning...' : 'Auto-Fill Fields'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="company">Company Name</label>
            <input
              id="company"
              type="text"
              required
              placeholder="e.g. Google"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role / Position</label>
            <input
              id="role"
              type="text"
              required
              placeholder="e.g. Frontend Engineer"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
          </div>

          <div className="form-row form-group-half">
            <div className="form-group">
              <label htmlFor="dateApplied">Date Applied</label>
              <input
                id="dateApplied"
                type="date"
                required
                value={formData.dateApplied || ''}
                onChange={(e) => setFormData({ ...formData, dateApplied: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="deadline">Deadline</label>
              <input
                id="deadline"
                type="date"
                value={formData.deadline || ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row form-group-half">
            <div className="form-group">
              <label htmlFor="type">Job Type</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="form-row form-group-half">
            <div className="form-group">
              <label htmlFor="resumeFile">Resume (PDF/Doc)</label>
              <input
                id="resumeFile"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files[0])}
              />
              {formData.resumeUrl && <small><a href={formData.resumeUrl} target="_blank" rel="noopener noreferrer" download="Resume.pdf">Current Resume</a></small>}
            </div>

            <div className="form-group">
              <label htmlFor="coverLetterFile">Cover Letter</label>
              <input
                id="coverLetterFile"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCoverLetterFile(e.target.files[0])}
              />
              {formData.coverLetterUrl && <small><a href={formData.coverLetterUrl} target="_blank" rel="noopener noreferrer" download="CoverLetter.pdf">Current Cover Letter</a></small>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Job Description</label>
            <textarea
              id="description"
              rows={4}
              placeholder="Paste the job description here to use AI Matching..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group ai-match-section" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: formData.matchPercentage !== undefined ? '15px' : '0' }}>
              <h4 style={{ margin: 0, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>✨</span> AI Job Match
              </h4>
              <button type="button" onClick={handleAIMatch} disabled={isAnalyzingMatch} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                {isAnalyzingMatch ? 'Analyzing...' : 'Generate Match Score'}
              </button>
            </div>
            
            {formData.matchPercentage !== undefined && (
              <div className="match-results">
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: formData.matchPercentage >= 80 ? '#10b981' : formData.matchPercentage >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {formData.matchPercentage}% Match
                </div>
                {formData.smartSuggestions && formData.smartSuggestions.length > 0 && (
                  <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: '#475569', marginTop: '10px' }}>
                    {formData.smartSuggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Any details about the interview process, links, etc."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Application')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
