import React, { useState, useEffect } from 'react';
import { X, Zap, Link } from 'lucide-react';
import { analyzeJobMatch, simulateAutoFillJob } from '../../services/openai';
import { AutocompleteInput, SUGGESTION_DICTIONARY } from '../common/AutocompleteInput';
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
            <AutocompleteInput
              id="company"
              value={formData.company}
              onChange={(val) => setFormData({ ...formData, company: val })}
              placeholder="e.g. Google"
              suggestions={SUGGESTION_DICTIONARY.companies}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role / Position</label>
            <AutocompleteInput
              id="role"
              value={formData.role}
              onChange={(val) => setFormData({ ...formData, role: val })}
              placeholder="e.g. Frontend Engineer"
              suggestions={SUGGESTION_DICTIONARY.jobTitles}
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
                <option value="Freelance">Freelance</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Saved">Saved</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interviewing</option>
                <option value="Offer">Offer Received</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label htmlFor="description" style={{ marginBottom: 0 }}>Job Description</label>
              <button 
                type="button" 
                onClick={handleAIMatch}
                disabled={isAnalyzingMatch}
                style={{ 
                  background: 'none', border: 'none', color: 'var(--primary-color)', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                  fontWeight: 600, fontSize: '0.85rem'
                }}
              >
                <Zap size={14} /> {isAnalyzingMatch ? 'Analyzing...' : 'AI Match Score'}
              </button>
            </div>

            <textarea
              id="description"
              rows="4"
              placeholder="Paste full job description here..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {formData.matchPercentage !== undefined && (
            <div className="ai-match-result" style={{ background: '#f0fdf4', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: '#166534' }}>AI Match Score:</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#15803d' }}>{formData.matchPercentage}%</span>
              </div>
              {formData.smartSuggestions && (
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#166534' }}>
                  {formData.smartSuggestions.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="notes">Notes / Contact Details</label>
            <textarea
              id="notes"
              rows="2"
              placeholder="Interview details, recruiter contacts, salary details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
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
