import React, { useState, useEffect } from 'react';
import { X, Zap, Link, Sparkles, RefreshCw, FileText, CheckCircle2, Upload } from 'lucide-react';
import { analyzeJobMatch, simulateAutoFillJob, generateTailoredJobDescription } from '../../services/openai';
import { AutocompleteInput, SUGGESTION_DICTIONARY } from '../common/AutocompleteInput';
import { useAuth } from '../../context/AuthContext';
import './JobForm.css';

export default function JobForm({ isOpen, onClose, onSubmit, initialData }) {
  const { currentUser } = useAuth();
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
    resumeUrl: null,
    resumeName: null,
  });

  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
  const [autoFillUrl, setAutoFillUrl] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const formatDateForInput = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.split('T')[0];
    if (val && typeof val === 'object' && val.seconds) {
      return new Date(val.seconds * 1000).toISOString().split('T')[0];
    }
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    return String(val);
  };

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
        dateApplied: formatDateForInput(mappedData.dateApplied) || getTodayStr(),
        deadline: formatDateForInput(mappedData.deadline) || '',
        description: mappedData.description || '',
        notes: mappedData.notes || '',
        resumeUrl: mappedData.resumeUrl || localStorage.getItem('jobTracker_resumeUrl') || null,
        resumeName: mappedData.resumeName || localStorage.getItem('jobTracker_resumeName') || 'Master_CV_Synced.pdf',
        coverLetterUrl: mappedData.coverLetterUrl || null,
        matchPercentage: mappedData.matchPercentage,
        smartSuggestions: mappedData.smartSuggestions,
      });
    } else {
      const activeCvUrl = localStorage.getItem('jobTracker_resumeUrl') || null;
      const activeCvName = localStorage.getItem('jobTracker_resumeName') || 'Master_CV_Synced.pdf';
      setFormData({ 
        company: '', 
        role: '', 
        type: 'Full-time', 
        status: 'Applied', 
        dateApplied: getTodayStr(), 
        deadline: '', 
        description: '', 
        notes: '',
        resumeUrl: activeCvUrl,
        resumeName: activeCvName
      });
      setResumeFile(null);
      setCoverLetterFile(null);
    }
  }, [initialData, isOpen]);

  const handleUseMasterCV = () => {
    const activeCvUrl = localStorage.getItem('jobTracker_resumeUrl') || 'data:application/pdf;base64,';
    const activeCvName = localStorage.getItem('jobTracker_resumeName') || 'Master_CV_Synced.pdf';
    setFormData(prev => ({
      ...prev,
      resumeUrl: activeCvUrl,
      resumeName: activeCvName
    }));
    setResumeFile(null);
  };

  const handleAIMatch = async () => {
    let activeDescription = formData.description;
    if (!activeDescription || activeDescription.trim().length < 20) {
      if (formData.role || formData.company) {
        activeDescription = await generateTailoredJobDescription(formData.role, formData.company);
        setFormData(prev => ({ ...prev, description: activeDescription }));
      } else {
        alert("Please enter a Role or Company Name first!");
        return;
      }
    }

    let savedResume = localStorage.getItem('jobTracker_resumeText');
    if (!savedResume) {
      const profileKey = currentUser?.uid ? `jobtracker_user_profile_${currentUser.uid}` : '';
      const localProfile = profileKey ? JSON.parse(localStorage.getItem(profileKey) || '{}') : {};
      const name = localProfile.fullName || currentUser?.displayName || 'Candidate';
      const title = localProfile.professionalTitle || formData.role || 'Software Engineering Professional';
      const skills = localProfile.technicalSkills || 'JavaScript, React, Node.js, Python, Full Stack Engineering, System Architecture';
      const bio = localProfile.bio || 'Experienced engineering professional focused on high-performance web applications.';
      savedResume = `${name} - ${title}\nTechnical Skills: ${skills}\nExecutive Bio: ${bio}`;
    }

    setIsAnalyzingMatch(true);
    try {
      const matchData = await analyzeJobMatch(savedResume, activeDescription);
      setFormData(prev => ({
        ...prev,
        matchPercentage: matchData.matchPercentage,
        smartSuggestions: matchData.smartSuggestions
      }));
    } catch (err) {
      console.error("AI Match calculation failed:", err);
    } finally {
      setIsAnalyzingMatch(false);
    }
  };

  const handleGenerateDesc = async () => {
    if (!formData.role && !formData.company) {
      alert("Please enter a Role / Position or Company Name first!");
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const generatedDesc = await generateTailoredJobDescription(formData.role, formData.company);
      setFormData(prev => ({
        ...prev,
        description: generatedDesc
      }));
    } catch (err) {
      console.error("Failed to generate description:", err);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const savePromise = onSubmit(formData, resumeFile, coverLetterFile);
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2500));
      await Promise.race([savePromise, timeoutPromise]);

      setIsSubmitting(false);
      setIsSaved(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsSaved(false);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setIsSubmitting(false);
      onClose();
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <label htmlFor="description" style={{ marginBottom: 0 }}>Job Description</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={handleGenerateDesc}
                  disabled={isGeneratingDesc}
                  style={{ 
                    background: 'none', border: 'none', color: '#2563eb', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    fontWeight: 600, fontSize: '0.85rem'
                  }}
                >
                  {isGeneratingDesc ? <RefreshCw size={14} className="spin-animation" /> : <Sparkles size={14} />}
                  <span>{isGeneratingDesc ? 'Generating...' : '✨ Auto-Fill Description'}</span>
                </button>
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
            </div>

            <textarea
              id="description"
              rows="5"
              placeholder="Paste or click '✨ Auto-Fill Description' to auto-generate..."
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
                  {Array.isArray(formData.smartSuggestions) ? (
                    formData.smartSuggestions.map((s, idx) => <li key={idx}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>)
                  ) : typeof formData.smartSuggestions === 'string' ? (
                    <li>{formData.smartSuggestions}</li>
                  ) : null}
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

          {/* Resume / CV Attachment Section */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ marginBottom: 0, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={18} color="#2563eb" /> Attached Resume / CV
              </label>
              <button
                type="button"
                className="btn-use-master-cv"
                onClick={handleUseMasterCV}
                style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(37, 99, 235, 0.1)'
                }}
              >
                <Sparkles size={14} /> ✨ Auto-Attach Master CV from Resume Studio
              </button>
            </div>

            {formData.resumeUrl || formData.resumeName ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                    {formData.resumeName || 'Master_CV_Synced.pdf'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Active CV Attached</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, resumeUrl: null, resumeName: null }));
                    setResumeFile(null);
                  }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Remove / Upload Custom PDF
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setResumeFile(e.target.files[0]);
                        setFormData(prev => ({ ...prev, resumeName: e.target.files[0].name }));
                      }
                    }}
                    style={{ fontSize: '0.85rem', flex: 1 }}
                  />
                </div>
                {resumeFile && <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>✓ Attached Custom File: {resumeFile.name}</span>}
              </div>
            )}
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting || isSaved}
              style={isSaved ? { background: '#10b981', borderColor: '#10b981', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '6px' } : {}}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 size={16} color="white" /> Saved!
                </>
              ) : isSubmitting ? (
                'Saving...'
              ) : (
                initialData ? 'Save Changes' : 'Add Application'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
