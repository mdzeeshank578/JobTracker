import { jobRepository } from '../repositories/job.repository.js';

export const analyticsService = {
  async getDashboardMetrics(userId) {
    const jobs = await jobRepository.findAllByUserId(userId);
    const total = jobs.length;
    const applied = jobs.filter(j => j.status === 'Applied').length;
    const interviewing = jobs.filter(j => j.status === 'Interviewing' || j.status === 'Interview').length;
    const assessment = jobs.filter(j => j.status === 'Assessment').length;
    const offer = jobs.filter(j => j.status === 'Offer').length;
    const rejected = jobs.filter(j => j.status === 'Rejected').length;

    const conversionRate = total > 0 ? Math.round(((interviewing + offer) / total) * 100) : 0;

    return {
      total,
      applied,
      interviewing,
      assessment,
      offer,
      rejected,
      conversionRate
    };
  }
};
