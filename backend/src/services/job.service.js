import { jobRepository } from '../repositories/job.repository.js';
import { ApiError } from '../utils/apiError.js';

export const jobService = {
  async getJobs(userId, options = {}) {
    if (!userId) throw new ApiError(401, '401 Unauthorized: User authentication required');
    return await jobRepository.findAllByUserId(userId, options);
  },

  async getJobById(id, userId) {
    if (!userId) throw new ApiError(401, '401 Unauthorized: User authentication required');
    const job = await jobRepository.findByIdAndUserId(id, userId);
    if (!job) {
      throw new ApiError(404, '404 Not Found: Job application not found or belongs to another user');
    }
    return job;
  },

  async createJob(userId, jobData) {
    if (!userId) throw new ApiError(401, '401 Unauthorized: User authentication required');
    
    const companyName = jobData.companyName || jobData.company;
    const jobTitle = jobData.jobTitle || jobData.role;

    if (!companyName || !jobTitle) {
      throw new ApiError(400, '400 Bad Request: companyName and jobTitle are required fields');
    }

    return await jobRepository.create({
      ...jobData,
      companyName,
      jobTitle,
      userId // ALWAYS enforce req.user.id as userId
    });
  },

  async updateJob(id, userId, updates) {
    if (!userId) throw new ApiError(401, '401 Unauthorized: User authentication required');

    // Verify job belongs to this user before updating
    const existing = await jobRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new ApiError(404, '404 Not Found: Job application not found or belongs to another user');
    }

    // Strip out userId from updates payload to prevent ownership override
    delete updates.userId;
    delete updates.user_id;

    return await jobRepository.update(id, userId, updates);
  },

  async deleteJob(id, userId) {
    if (!userId) throw new ApiError(401, '401 Unauthorized: User authentication required');

    // Verify job belongs to this user before deleting
    const existing = await jobRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new ApiError(404, '404 Not Found: Job application not found or belongs to another user');
    }

    return await jobRepository.delete(id, userId);
  }
};
