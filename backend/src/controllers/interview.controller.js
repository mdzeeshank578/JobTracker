import { ApiResponse } from '../utils/apiResponse.js';

export const interviewController = {
  async getInterviews(req, res, next) {
    try {
      return res.status(200).json(new ApiResponse(200, [], 'Interviews retrieved'));
    } catch (error) {
      next(error);
    }
  }
};
