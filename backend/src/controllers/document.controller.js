import { ApiResponse } from '../utils/apiResponse.js';

export const documentController = {
  async getDocuments(req, res, next) {
    try {
      return res.status(200).json(new ApiResponse(200, [], 'Documents retrieved'));
    } catch (error) {
      next(error);
    }
  }
};
