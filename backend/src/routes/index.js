import express from 'express';
import authRoutes from './auth.routes.js';
import jobRoutes from './job.routes.js';
import analyticsRoutes from './analytics.routes.js';
import interviewRoutes from './interview.routes.js';
import profileRoutes from './profile.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/interviews', interviewRoutes);
router.use('/profile', profileRoutes);

export default router;
