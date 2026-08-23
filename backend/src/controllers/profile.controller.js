import { userRepository } from '../repositories/user.repository.js';

export const profileController = {
  // GET /api/profile
  async getProfile(req, res, next) {
    try {
      // Strictly extract authenticated userId from JWT payload
      const userId = req.user.id;
      const profile = await userRepository.getProfile(userId);
      return res.status(200).json({
        success: true,
        profile
      });
    } catch (error) {
      next(error);
    }
  },

  // POST / PUT /api/profile
  async updateProfile(req, res, next) {
    try {
      // Strictly extract authenticated userId from JWT payload
      const userId = req.user.id;
      const profileData = { ...(req.body || {}) };

      // Strictly strip any client-supplied userId overrides to prevent impersonation
      delete profileData.userId;
      delete profileData.user_id;

      const saved = await userRepository.saveProfile(userId, profileData);
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        profile: saved
      });
    } catch (error) {
      next(error);
    }
  }
};
