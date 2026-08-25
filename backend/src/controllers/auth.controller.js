import jwt from 'jsonwebtoken';
import { authService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export const authController = {
  async register(req, res, next) {
    try {
      const { email, password, displayName } = req.body || {};
      
      const cleanEmail = (email || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, statusCode: 400, message: 'Please provide a valid email address.' });
      }
      if (!password || password.length < 8) {
        return res.status(400).json({ success: false, statusCode: 400, message: 'Password must be at least 8 characters long.' });
      }

      const user = await authService.register(cleanEmail, password, (displayName || '').trim());
      const token = jwt.sign({ id: user.uid, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json(new ApiResponse(201, { user, token }, 'Account registered successfully'));
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !password) {
        return res.status(400).json({ success: false, statusCode: 400, message: 'Email and password are required.' });
      }

      const user = await authService.login(cleanEmail, password);
      const token = jwt.sign({ id: user.uid, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json(new ApiResponse(200, { user, token }, 'Logged in successfully'));
    } catch (error) {
      next(error);
    }
  }
};
