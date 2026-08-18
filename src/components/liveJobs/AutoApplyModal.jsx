import React, { useState, useEffect } from 'react';
import { X, Send, FileText, CheckCircle2, Sparkles, Building2, User, Mail, Phone, MapPin, Link as LinkIcon, Globe, ShieldCheck, ExternalLink } from 'lucide-react';
import './AutoApplyModal.css';

export default function AutoApplyModal({ job, onClose, onConfirmApply, userProfile }) {
  if (!job) return null;

  const [formData, setFormData] = useState({
    fullName: userProfile?.fullName || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    location: userProfile?.location || '',
    linkedIn: userProfile?.linkedIn || '',
    portfolio: userProfile?.portfolio || '',
    coverLetter: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto-generate a custom tailored cover letter for this job and candidate
  useEffect(() => {
    const candidateName = userProfile?.fullName || 'Candidate';
    const candidateTitle = userProfile?.professionalTitle || 'Software Engineering Professional';
    const skills = [userProfile?.technicalSkills, userProfile?.frameworks].filter(Boolean).join(', ') || 'React, Node.js, JavaScript, Cloud Architecture';
    const company = job.company || 'your organization';
    const role = job.title || 'Software Developer';

    const generatedLetter = `Dear Hiring Manager at ${company},

I am writing to express my enthusiastic interest in the ${role} position. As a ${candidateTitle} skilled in ${skills}, I have a proven track record of engineering scalable, high-performance web applications and delivering measurable business impact.

Based on my background and portfolio, I am confident in my ability to immediately contribute to ${company}'s technical milestones. Attached is my Master CV for your review.

Thank you for your time and consideration. I look forward to discussing how my experience aligns with your team's goals.

Sincerely,
${candidateName}`;

    setFormData(prev => ({
      ...prev,
      coverLetter: generatedLetter
    }));
  }, [job, userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate direct gateway application submission & tracking
    await new Promise(r => setTimeout(r, 1200));

    await onConfirmApply(job, {
      ...formData,
      appliedVia: 'JobTracker In-App Direct Gateway',
      submissionId: `APP-${Date.now().toString().slice(-6)}`
    });

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const syncedResumeName = localStorage.getItem('jobTracker_resumeName') || 'Master_CV_Synced.pdf';

  return (
    <div className="auto-apply-overlay" onClick={onClose}>
      <div className="auto-apply-modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="auto-apply-header">
          <div className="company-badge-header">
            <div className="company-logo-circle">
              {job.companyLogo ? <img src={job.companyLogo} alt="" /> : <Building2 size={24} color="#2563eb" />}
            </div>
            <div>
              <span className="direct-apply-tag"><Sparkles size={12} /> 1-Click In-App Direct Apply</span>
              <h2>{job.title}</h2>
              <p>{job.company} • {job.location}</p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {isSubmitted ? (
          <div className="apply-success-container fade-in">
            <div className="success-icon-circle">
              <CheckCircle2 size={48} color="#10b981" />
            </div>
            <h3>Application Submitted & Tracked Successfully!</h3>
            <p>Your application and tailored Master CV have been submitted directly for <strong>{job.title}</strong> at <strong>{job.company}</strong>.</p>
            
            <div className="success-meta-box">
              <div><span>Status:</span> <strong style={{ color: '#10b981' }}>Applied & Synced</strong></div>
              <div><span>Submission ID:</span> <strong>APP-{Date.now().toString().slice(-6)}</strong></div>
              <div><span>Applied On:</span> <strong>{new Date().toLocaleDateString()}</strong></div>
            </div>

            <div className="success-actions">
              {job.applyUrl && (
                <a href={job.applyUrl} target="_blank" rel="noreferrer" className="btn-secondary-link">
                  View Official Company Listing <ExternalLink size={14} />
                </a>
              )}
              <button type="button" className="btn-primary-done" onClick={onClose}>
                Done & View Tracker
              </button>
            </div>
          </div>
        ) : (
          <form className="auto-apply-body" onSubmit={handleSubmit}>
            <div className="section-title">
              <User size={16} color="#2563eb" /> Candidate Master Profile (Auto-Filled)
            </div>

            <div className="grid-2-cols">
              <div className="input-field">
                <label>Full Name</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
              </div>
              <div className="input-field">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="input-field">
                <label>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 9051162278" />
              </div>
              <div className="input-field">
                <label>Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Kolkata, India" />
              </div>
              <div className="input-field">
                <label>LinkedIn Profile URL</label>
                <input type="url" name="linkedIn" value={formData.linkedIn} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="input-field">
                <label>Portfolio / Website URL</label>
                <input type="url" name="portfolio" value={formData.portfolio} onChange={handleChange} placeholder="https://yourportfolio.com" />
              </div>
            </div>

            <div className="section-title" style={{ marginTop: '16px' }}>
              <FileText size={16} color="#2563eb" /> Attached Synced Master CV
            </div>
            
            <div className="synced-cv-card">
              <FileText size={24} color="#2563eb" />
              <div className="synced-cv-info">
                <span className="cv-filename">{syncedResumeName}</span>
                <span className="cv-status">✓ Master Profile & PDF Ready for Direct Submission</span>
              </div>
              <ShieldCheck size={20} color="#10b981" />
            </div>

            <div className="section-title" style={{ marginTop: '16px' }}>
              <Sparkles size={16} color="#2563eb" /> Tailored Cover Letter (Auto-Generated)
            </div>
            <textarea
              name="coverLetter"
              rows={5}
              value={formData.coverLetter}
              onChange={handleChange}
              className="cover-letter-textarea"
              required
            />

            <div className="auto-apply-footer">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-submit-apply" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="apply-spinner"></div> Submitting Direct Application...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Submit Application & Track Direct
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
