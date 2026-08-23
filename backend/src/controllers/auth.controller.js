import jwt from 'jsonwebtoken';
import { authService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export const authController = {
  async register(req, res, next) {
    try {
      const { email, password, displayName } = req.body;
      const user = await authService.register(email, password, displayName);
      const token = jwt.sign({ id: user.uid, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json(new ApiResponse(201, { user, token }, 'Account registered successfully'));
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await authService.login(email, password);
      const token = jwt.sign({ id: user.uid, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json(new ApiResponse(200, { user, token }, 'Logged in successfully'));
    } catch (error) {
      next(error);
    }
  }
};
