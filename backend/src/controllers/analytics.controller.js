import { analyticsService } from '../services/analytics.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const analyticsController = {
  async getMetrics(req, res, next) {
    try {
      const userId = req.query.userId || req.userId;
      const metrics = await analyticsService.getDashboardMetrics(userId);
      return res.status(200).json(new ApiResponse(200, metrics, 'Metrics retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }
};
