import React from 'react';
import { ArrowUpRight, X } from 'lucide-react';

function Section({ title, items, fallback }) {
  if (!items?.length && !fallback) return null;
  return (
    <section>
      <h4>{title}</h4>
      {items?.length ? (
        <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul>
      ) : (
        <p>{fallback}</p>
      )}
    </section>
  );
}

export default function JobDetailsModal({ job, onClose, onApply }) {
  if (!job) return null;

  return (
    <div className="job-detail-overlay" onClick={onClose}>
      <div className="job-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="job-detail-header">
          <div>
            <span>{job.sourceApi}</span>
            <h2>{job.title}</h2>
            <p>{job.company} • {job.location}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details"><X size={22} /></button>
        </div>

        <div className="job-detail-body">
          <Section title="Complete Job Description" fallback={job.description || 'The provider did not include a full description.'} />
          <Section title="Responsibilities" items={job.responsibilities} />
          <Section title="Required Skills" items={job.requiredSkills} />
          <Section title="Preferred Skills" items={job.preferredSkills} />
          <Section title="Benefits" items={job.benefits} />
          <Section title="Company Information" fallback={job.companyInfo} />

          {job.ai?.resumeImprovementSuggestions?.length > 0 && (
            <Section title="Resume Improvement Suggestions" items={job.ai.resumeImprovementSuggestions} />
          )}
        </div>

        <div className="job-detail-footer">
          <a href={job.applyUrl} target="_blank" rel="noreferrer">Official Apply Link</a>
          <button type="button" className="btn-primary-live" onClick={() => onApply(job)}>
            Apply Now <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
