import express from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';

const router = express.Router();

router.get('/', analyticsController.getMetrics);

export default router;
