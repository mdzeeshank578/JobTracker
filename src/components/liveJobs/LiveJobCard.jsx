import React from 'react';
import { ArrowUpRight, Bookmark, Building2, CalendarDays, CheckCircle2, MapPin, Sparkles, XCircle } from 'lucide-react';

function formatDate(value) {
  if (!value) return 'Recently posted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LiveJobCard({ job, onViewDetails, onApply, onSave }) {
  const ai = job.ai;
  const match = ai?.resumeMatchPercentage;

  return (
    <article className="live-job-card">
      <div className="job-card-topline">
        <div className="company-mark">
          {job.companyLogo ? <img src={job.companyLogo} alt="" /> : <Building2 size={22} />}
        </div>
        <div className="job-card-heading">
          <h3>{job.title}</h3>
          <p>{job.company}</p>
        </div>
        <span className="source-pill">{job.sourceApi}</span>
      </div>

      <div className="job-meta-row">
        <span><MapPin size={14} /> {job.location}</span>
        <span><CalendarDays size={14} /> {formatDate(job.postedDate)}</span>
        <span>{job.employmentType}</span>
        <span>{job.experienceRequired}</span>
      </div>

      <p className="salary-text">{job.salary?.display || 'Salary not disclosed'}</p>
      <p className="job-description-preview">{job.shortDescription || 'No preview available from the provider.'}</p>

      {job.skills?.length > 0 && (
        <div className="skill-cloud">
          {job.skills.slice(0, 6).map(skill => <span key={skill}>{skill}</span>)}
        </div>
      )}

      <div className="ai-match-panel">
        <div className="match-score">
          <Sparkles size={17} />
          <div>
            <span>Resume Match</span>
            <strong>{match ? `${match}%` : 'Add resume'}</strong>
          </div>
        </div>
        <div className="ai-mini-grid">
          <div>
            <span>ATS</span>
            <strong>{ai?.atsScore ? `${ai.atsScore}%` : '-'}</strong>
          </div>
          <div>
            <span>Interview</span>
            <strong>{ai?.interviewReadinessScore ? `${ai.interviewReadinessScore}%` : '-'}</strong>
          </div>
        </div>
      </div>

      {(ai?.matchingSkills?.length > 0 || ai?.missingSkills?.length > 0) && (
        <div className="match-skills">
          <div>
            <h4>Matching Skills</h4>
            {(ai.matchingSkills || []).slice(0, 4).map(skill => (
              <span className="skill-hit" key={skill}><CheckCircle2 size={13} /> {skill}</span>
            ))}
          </div>
          <div>
            <h4>Missing Skills</h4>
            {(ai.missingSkills || []).slice(0, 4).map(skill => (
              <span className="skill-gap" key={skill}><XCircle size={13} /> {skill}</span>
            ))}
          </div>
        </div>
      )}

      {ai?.resumeImprovementSuggestions?.length > 0 && (
        <p className="ai-suggestion">{ai.resumeImprovementSuggestions[0]}</p>
      )}

      <div className="job-actions">
        <button type="button" className="btn-muted" onClick={() => onViewDetails(job)}>View Details</button>
        <button type="button" className="btn-primary-live" onClick={() => onApply(job)}>
          Apply Now <ArrowUpRight size={16} />
        </button>
        <button type="button" className="btn-icon-live" onClick={() => onSave(job)} title="Save Job">
          <Bookmark size={17} />
        </button>
      </div>
    </article>
  );
}
