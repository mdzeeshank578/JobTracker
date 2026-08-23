import express from 'express';
import { interviewController } from '../controllers/interview.controller.js';

const router = express.Router();

router.get('/', interviewController.getInterviews);

export default router;
