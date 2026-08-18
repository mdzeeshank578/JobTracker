import React, { useState } from 'react';
import { Building2, Calendar, Edit2, Trash2, Clock, AlertCircle, FileText, Target } from 'lucide-react';
import { generateInterviewPrep } from '../../services/openai';
import './JobCard.css';

export default function JobCard({ job, onEdit, onDelete, isGlobal = false, onSaveGlobal }) {
  const [showPrep, setShowPrep] = useState(false);
  const [prepData, setPrepData] = useState(null);
  const [isLoadingPrep, setIsLoadingPrep] = useState(false);

  const handleDownloadAttachment = async (attachment) => {
    try {
      const token = localStorage.getItem(`jobtracker_google_token_${job.userId}`);
      if (!token) {
        alert("Please connect or sync Gmail to authenticate and download attachments.");
        return;
      }
      
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${attachment.messageId}/attachments/${attachment.attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (!response.ok) throw new Error("Failed to fetch attachment from Gmail");
      const data = await response.json();
      
      const base64Data = data.data.replace(/-/g, '+').replace(/_/g, '/');
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: attachment.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error downloading attachment: " + err.message);
    }
  };

  // Map status to css class
  const getStatusClass = (status) => {
    switch (status) {
      case 'Interviewing': return 'status-interview';
      case 'Offer': return 'status-offer';
      case 'Rejected': return 'status-rejected';
      default: return 'status-applied';
    }
  };

  const formattedDate = job.appliedDate 
    ? new Date(job.appliedDate).toLocaleDateString() 
    : (job.dateApplied ? new Date(job.dateApplied).toLocaleDateString() : 'No date');

  // Deadline logic
  let isDeadlineNear = false;
  let formattedDeadline = null;
  if (job.deadline) {
    const deadlineDate = new Date(job.deadline);
    formattedDeadline = deadlineDate.toLocaleDateString();
    
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 3) {
      isDeadlineNear = true;
    }
  }

  return (
    <div className="job-card">
      <div className="job-card-header">
        <div className="job-company">
          <div className="company-icon">
            <Building2 size={20} />
          </div>
          <div>
            <h3>{job.role}</h3>
            <p className="company-name">{job.company}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {job.matchPercentage !== undefined && job.matchPercentage !== null && job.matchPercentage !== '' && (
            <div className="job-status" style={{ background: job.matchPercentage >= 80 ? 'rgba(16, 185, 129, 0.15)' : job.matchPercentage >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: job.matchPercentage >= 80 ? '#059669' : job.matchPercentage >= 50 ? '#d97706' : '#dc2626', border: '1px solid currentColor' }}>
              ✨ {job.matchPercentage}% Match
            </div>
          )}
          <div className={`job-status ${isGlobal ? 'status-new' : getStatusClass(job.status)}`} style={isGlobal ? {background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd'} : {}}>
            {isGlobal ? 'New Vacancy' : job.status}
          </div>
        </div>
      </div>
      
      {job.smartSuggestions && job.smartSuggestions.length > 0 && (
        <div className="job-notes" style={{ background: '#f8fafc', borderLeft: '4px solid #4f46e5' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4f46e5', marginBottom: '8px' }}><AlertCircle size={14} /> AI Match Suggestions:</strong>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: '#334155' }}>
            {job.smartSuggestions.map((sug, i) => React.createElement('li', {key: i, style: {marginBottom: '4px'}}, sug))}
          </ul>
        </div>
      )}

      {job.notes && (
        <div className="job-notes">
          <p>{job.notes}</p>
        </div>
      )}

      {job.interviewDate && (
        <div className="job-meta-details" style={{ margin: '0 16px 12px 16px', padding: '10px 14px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <Clock size={15} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#1e293b' }}>Interview Date:</strong> <span style={{ color: '#4f46e5', fontWeight: 600 }}>{new Date(job.interviewDate).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {(job.recruiterName || job.recruiterEmail || job.referenceNumber) && (
        <div className="job-meta-details" style={{ margin: '0 16px 12px 16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>Recruiter details:</div>
          {job.recruiterName && <div>Name: {job.recruiterName}</div>}
          {job.recruiterEmail && <div>Email: <a href={`mailto:${job.recruiterEmail}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{job.recruiterEmail}</a></div>}
          {job.referenceNumber && <div>Ref ID: {job.referenceNumber}</div>}
        </div>
      )}

      {job.status === 'Rejected' && (job.rejectionTimestamp || job.rejectionEmailText) && (
        <div className="job-meta-details" style={{ margin: '0 16px 12px 16px', padding: '12px 14px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)', fontSize: '0.85rem', color: '#b91c1c' }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <AlertCircle size={16} /> Rejection Records
          </div>
          {job.rejectionTimestamp && (
            <div style={{ marginBottom: '4px', fontSize: '0.8rem', color: '#7f1d1d' }}>
              <strong>Date Received:</strong> {new Date(job.rejectionTimestamp).toLocaleString()}
            </div>
          )}
          {job.rejectionEmailText && (
            <div style={{ background: '#fff', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.8rem', color: '#4b5563', maxHeight: '110px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontStyle: 'italic', fontFamily: 'monospace' }}>
              {job.rejectionEmailText}
            </div>
          )}
        </div>
      )}

      {job.activities && job.activities.length > 0 && (
        <div className="job-meta-details" style={{ margin: '0 16px 12px 16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569' }}>
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            📜 Activity History
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto', paddingRight: '4px' }}>
            {job.activities.slice().reverse().map((act) => (
              <div key={act.id} style={{ display: 'flex', gap: '6px', borderLeft: '2px solid #cbd5e1', paddingLeft: '8px', marginLeft: '4px' }}>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{new Date(act.timestamp).toLocaleString()}</div>
                  <div style={{ color: '#334155', fontWeight: 500 }}>{act.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {((job.resumeUrl || job.coverLetterUrl) || (job.attachments && job.attachments.length > 0)) && (
        <div className="job-documents">
          {job.resumeUrl && (
            <a href={job.resumeUrl} target="_blank" rel="noopener noreferrer" className="document-link" download="Resume.pdf">
              <FileText size={14} /> Resume
            </a>
          )}
          {job.coverLetterUrl && (
            <a href={job.coverLetterUrl} target="_blank" rel="noopener noreferrer" className="document-link" download="CoverLetter.pdf">
              <FileText size={14} /> Cover Letter
            </a>
          )}
          {job.attachments && job.attachments.map((att, i) => (
            <button 
              key={i} 
              onClick={() => handleDownloadAttachment(att)} 
              className="document-link" 
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', display: 'flex', alignItems: 'center', gap: '4px', textAlign: 'left', color: '#4f46e5' }}
            >
              <FileText size={14} /> {att.filename}
            </button>
          ))}
        </div>
      )}

      {showPrep && (
        <div style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', margin: 0 }}>
            <Target size={16} /> AI Interview Prep
          </h4>
          {isLoadingPrep ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: '#4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Generating custom prep for {job.company}...
            </div>
          ) : prepData ? (
            <div style={{ fontSize: '0.9rem', color: '#334155' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#0f172a' }}>🎯 Top Questions & Answers:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: 0 }}>
                  {prepData.questions.map((q, i) => React.createElement('li', {key: 'q'+i, style: {marginBottom: '10px'}}, 
                    React.createElement('div', {style: {fontWeight: 500}}, q),
                    React.createElement('div', {style: {color: '#64748b', fontStyle: 'italic', marginTop: '4px'}}, "💡 " + prepData.answers[i])
                  ))}
                </ul>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>✨ Pro Tips:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: 0 }}>
                  {prepData.tips.map((t, i) => React.createElement('li', {key: 't'+i, style: {marginBottom: '4px'}}, t))}
                </ul>
              </div>
            </div>
          ) : null}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}} />
        </div>
      )}

      <div className="job-card-footer">
        <div className="job-meta">
          <span className="meta-item">
            <Calendar size={14} /> {formattedDate}
          </span>
          {formattedDeadline && (
            <span className={`meta-item ${isDeadlineNear ? 'deadline-warning' : ''}`}>
               {isDeadlineNear ? <AlertCircle size={14} /> : <Calendar size={14} />} 
               Due: {formattedDeadline}
            </span>
          )}
        </div>
        
        <div className="job-actions">
          {isGlobal ? (
            <button 
              className="btn-primary" 
              onClick={() => onSaveGlobal(job)} 
              style={{ padding: '6px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              📥 Save to Tracker
            </button>
          ) : (
            <>
              <button 
                className="btn-icon" 
                onClick={async () => {
                  if (showPrep) {
                    setShowPrep(false);
                    return;
                  }
                  setShowPrep(true);
                  if (!prepData) {
                    setIsLoadingPrep(true);
                    try {
                      const data = await generateInterviewPrep(job.role, job.company);
                      setPrepData(data);
                    } catch(err) {
                      console.error(err);
                    } finally {
                      setIsLoadingPrep(false);
                    }
                  }
                }} 
                title="Interview Prep 🎯" 
                style={{ color: showPrep ? '#4f46e5' : '#64748b' }}
              >
                <Target size={16} />
              </button>
              <button className="btn-icon" onClick={() => onEdit(job)} title="Edit">
                <Edit2 size={16} />
              </button>
              <button className="btn-icon delete-btn" onClick={() => onDelete(job.id)} title="Delete">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
