import React, { useMemo, useState, useEffect } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { addJob, saveJobForLater, getUserProfile } from '../../services/db';
import { searchLiveJobs } from '../../services/liveJobsApi';
import JobDetailsModal from './JobDetailsModal';
import JobSearchPanel from './JobSearchPanel';
import LiveJobCard from './LiveJobCard';
import LoadingSkeleton from './LoadingSkeleton';
import AutoApplyModal from './AutoApplyModal';
import './LiveJobs.css';

const initialFilters = {
  role: '',
  location: '',
  experience: '',
  salaryRange: '',
  jobType: '',
  workMode: '',
  level: '',
  sortBy: 'latest',
  page: 1,
};

const filterChips = ['Remote', 'Hybrid', 'Onsite', 'Internship', 'Fresher', 'Experienced'];

export default function LiveJobs({ trackedJobs = [], onStartPractice }) {
  const { currentUser } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, provider: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [autoApplyJob, setAutoApplyJob] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const getTrackedJobStatus = (job) => {
    if (!trackedJobs || !Array.isArray(trackedJobs) || !job) return null;
    const companyLower = (job.company || '').toLowerCase().trim();
    const titleLower = (job.title || job.role || '').toLowerCase().trim();

    const found = trackedJobs.find(t => {
      const tCompany = (t.company || '').toLowerCase().trim();
      const tRole = (t.role || t.title || '').toLowerCase().trim();
      const companyMatch = tCompany === companyLower || tCompany.includes(companyLower) || companyLower.includes(tCompany);
      const roleMatch = tRole === titleLower || tRole.includes(titleLower) || titleLower.includes(tRole);
      return companyMatch && roleMatch;
    });

    return found ? (found.status || 'Applied') : null;
  };

  useEffect(() => {
    async function fetchProfile() {
      if (currentUser?.uid) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          if (profile) setUserProfile(profile);
        } catch (err) {
          console.error("Failed to load user profile in LiveJobs:", err);
        }
      }
    }
    fetchProfile();
  }, [currentUser]);

  const sortedJobs = useMemo(() => {
    const copy = [...jobs];
    if (filters.sortBy === 'salary') {
      return copy.sort((a, b) => (b.salary?.max || b.salary?.min || 0) - (a.salary?.max || a.salary?.min || 0));
    }
    if (filters.sortBy === 'match') {
      return copy.sort((a, b) => (b.ai?.resumeMatchPercentage || 0) - (a.ai?.resumeMatchPercentage || 0));
    }
    if (filters.sortBy === 'company') {
      return copy.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
    }
    return copy.sort((a, b) => new Date(b.postedDate || 0) - new Date(a.postedDate || 0));
  }, [jobs, filters.sortBy]);

  const runSearch = async (event, nextPage = 1, customFilters = null) => {
    event?.preventDefault();
    setIsLoading(true);
    setError('');
    const resumeText = localStorage.getItem('jobTracker_resumeText') || '';
    const activeFilters = customFilters || filters;

    try {
      const response = await searchLiveJobs({ ...activeFilters, page: nextPage, resumeText });
      setJobs(response.jobs || []);
      setMeta({
        page: response.page || nextPage,
        totalPages: response.totalPages || 1,
        total: response.total || 0,
        provider: response.provider || '',
        cached: response.cached,
      });
      setFilters(prev => ({ ...prev, ...activeFilters, page: response.page || nextPage }));
    } catch (err) {
      setError(err.message || 'Unable to search live jobs.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoRecommendForCV = (e) => {
    e?.preventDefault();
    const candidateRole = userProfile?.professionalTitle || userProfile?.technicalSkills?.split(',')[0] || 'Software Engineer';
    const candidateLocation = userProfile?.location?.split(',')[0] || '';

    const newFilters = {
      ...filters,
      role: candidateRole,
      location: candidateLocation,
      sortBy: 'match',
      page: 1
    };

    setFilters(newFilters);
    runSearch(null, 1, newFilters);
  };

  const toggleChip = (chip) => {
    setFilters(prev => {
      if (['Remote', 'Hybrid', 'Onsite'].includes(chip)) {
        return { ...prev, workMode: prev.workMode === chip ? '' : chip };
      }
      if (['Fresher', 'Experienced'].includes(chip)) {
        return { ...prev, level: prev.level === chip ? '' : chip, experience: prev.level === chip ? '' : chip };
      }
      return { ...prev, jobType: prev.jobType === chip ? '' : chip };
    });
  };

  const toTrackerJob = (job, status, applicationData = null) => ({
    company: job.company,
    role: job.title,
    type: job.employmentType || 'Full-time',
    status,
    dateApplied: new Date().toISOString().split('T')[0],
    deadline: '',
    description: job.description || job.shortDescription || '',
    notes: applicationData ? `Applied via In-App Direct Gateway (Submission ID: ${applicationData.submissionId}). Cover Letter Attached.` : `Source: ${job.sourceApi}. Official URL: ${job.applyUrl}`,
    jobUrl: job.applyUrl,
    source: job.sourceApi,
    sourceApi: job.sourceApi,
    matchPercentage: job.ai?.resumeMatchPercentage || null,
    smartSuggestions: job.ai?.resumeImprovementSuggestions || [],
    coverLetter: applicationData?.coverLetter || null,
    appliedVia: applicationData?.appliedVia || 'JobTracker Platform'
  });

  const handleOpenApplyModal = (job) => {
    setSelectedJob(null);
    setAutoApplyJob(job);
  };

  const handleConfirmApply = async (job, applicationData) => {
    await addJob(currentUser.uid, toTrackerJob(job, 'Applied', applicationData));
  };

  const handleSave = async (job) => {
    await saveJobForLater(currentUser.uid, {
      ...toTrackerJob(job, 'Saved'),
      savedAt: new Date().toISOString(),
      liveJobId: job.id,
    });
    alert(`${job.title} was saved for later.`);
  };

  return (
    <main className="live-jobs-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Live Global Vacancies Gateway</h2>
        <button
          type="button"
          onClick={handleAutoRecommendForCV}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
            transition: 'all 0.2s'
          }}
        >
          <Sparkles size={16} /> AI Auto-Recommend Jobs for My CV
        </button>
      </div>

      <JobSearchPanel filters={filters} setFilters={setFilters} onSearch={runSearch} isLoading={isLoading} />

      <div className="live-toolbar">
        <div className="chip-row">
          {filterChips.map(chip => {
            const active = filters.workMode === chip || filters.level === chip || filters.jobType === chip;
            return (
              <button key={chip} type="button" className={active ? 'chip active' : 'chip'} onClick={() => toggleChip(chip)}>
                {chip}
              </button>
            );
          })}
        </div>

        <label className="sort-control">
          Sort
          <select value={filters.sortBy} onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}>
            <option value="latest">Latest</option>
            <option value="match">Best Resume Match</option>
            <option value="salary">Highest Salary</option>
            <option value="company">Company Name</option>
          </select>
        </label>
      </div>

      {meta.provider && (
        <div className="result-summary">
          Showing {jobs.length} of {meta.total} results from {meta.provider}{meta.cached ? ' (cached)' : ''}
        </div>
      )}

      {error && (
        <div className="live-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={(event) => runSearch(event, filters.page)}><RotateCcw size={15} /> Retry</button>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="live-jobs-grid">
          {sortedJobs.map(job => (
            <LiveJobCard
              key={job.id}
              job={job}
              trackedStatus={getTrackedJobStatus(job)}
              onViewDetails={setSelectedJob}
              onApply={handleOpenApplyModal}
              onSave={handleSave}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && jobs.length === 0 && (
        <div className="empty-live-jobs">
          <h3>Search live vacancies or get AI CV Recommendations</h3>
          <p>Click "AI Auto-Recommend Jobs for My CV" or enter a role/location to fetch real openings.</p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="pagination-row">
          <button type="button" disabled={meta.page <= 1 || isLoading} onClick={(event) => runSearch(event, meta.page - 1)}>
            <ChevronLeft size={16} /> Previous
          </button>
          <span>Page {meta.page} of {meta.totalPages}</span>
          <button type="button" disabled={meta.page >= meta.totalPages || isLoading} onClick={(event) => runSearch(event, meta.page + 1)}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      <JobDetailsModal
        job={selectedJob}
        trackedStatus={getTrackedJobStatus(selectedJob)}
        onClose={() => setSelectedJob(null)}
        onApply={handleOpenApplyModal}
      />
      
      {autoApplyJob && (
        <AutoApplyModal
          job={autoApplyJob}
          onClose={() => setAutoApplyJob(null)}
          onConfirmApply={handleConfirmApply}
          userProfile={userProfile}
          onStartPractice={onStartPractice}
        />
      )}
    </main>
  );
}
