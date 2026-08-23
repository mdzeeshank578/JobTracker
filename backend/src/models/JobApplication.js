export const JOB_STATUS_ENUM = Object.freeze([
  'Applied',
  'Interviewing',
  'Assessment',
  'Offer',
  'Rejected',
  'Wishlist',
  'APPLIED',
  'INTERVIEW',
  'INTERVIEWING',
  'ASSESSMENT',
  'OFFER',
  'REJECTED',
  'WISHLIST'
]);

export function normalizeJobStatus(statusInput) {
  if (!statusInput) return 'Applied';
  const s = statusInput.toString().trim().toUpperCase();
  if (s === 'INTERVIEW' || s === 'INTERVIEWING') return 'Interviewing';
  if (s === 'OFFER' || s === 'ACCEPTED') return 'Offer';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'WISHLIST') return 'Wishlist';
  if (s === 'ASSESSMENT') return 'Assessment';
  return 'Applied';
}

export function createJobApplicationEntity(data) {
  const normStatus = normalizeJobStatus(data.status);
  const jobId = data._id || data.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const company = data.companyName || data.company || '';
  const role = data.jobTitle || data.role || '';

  return {
    _id: jobId,
    id: jobId,
    userId: data.userId || data.user_id,
    companyName: company,
    jobTitle: role,
    company: company,
    role: role,
    jobUrl: data.jobUrl || data.job_url || '',
    status: normStatus,
    appliedDate: data.appliedDate || data.date_applied || new Date().toISOString().split('T')[0],
    dateApplied: data.appliedDate || data.date_applied || new Date().toISOString().split('T')[0],
    deadline: data.deadline || null,
    notes: data.notes || '',
    location: data.location || '',
    source: data.source || 'Manual',
    snippet: data.snippet || '',
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
  };
}
