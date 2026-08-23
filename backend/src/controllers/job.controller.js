import { jobService } from '../services/job.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const jobController = {
  // GET /api/jobs (Filter by status, sort by date)
  async getJobs(req, res, next) {
    try {
      const userId = req.user.id; // ALWAYS use req.user.id (NEVER req.body or req.query)
      const { status, sortBy, order } = req.query;

      const jobs = await jobService.getJobs(userId, { status, sortBy, order });
      return res.status(200).json({
        success: true,
        count: jobs.length,
        jobs
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/jobs/:id
  async getJobById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // ALWAYS use req.user.id

      const job = await jobService.getJobById(id, userId);
      return res.status(200).json({
        success: true,
        job
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/jobs
  async createJob(req, res, next) {
    try {
      const userId = req.user.id; // ALWAYS use req.user.id
      const payload = { ...req.body };

      // Strictly strip any incoming userId in body
      delete payload.userId;
      delete payload.user_id;

      const job = await jobService.createJob(userId, payload);
      return res.status(201).json({
        success: true,
        message: 'Job application created successfully',
        job
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/jobs/:id
  async updateJob(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // ALWAYS use req.user.id
      const payload = { ...req.body };

      delete payload.userId;
      delete payload.user_id;

      const updatedJob = await jobService.updateJob(id, userId, payload);
      return res.status(200).json({
        success: true,
        message: 'Job application updated successfully',
        job: updatedJob
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/jobs/:id
  async deleteJob(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // ALWAYS use req.user.id

      await jobService.deleteJob(id, userId);
      return res.status(200).json({
        success: true,
        message: 'Job application deleted successfully',
        id
      });
    } catch (error) {
      next(error);
    }
  }
};
