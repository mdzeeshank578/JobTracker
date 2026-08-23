import express from 'express';
import { jobController } from '../controllers/job.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Enforce JWT authentication middleware on all job application routes
router.use(authenticateUser);

router.get('/', jobController.getJobs);
router.post('/', jobController.createJob);
router.get('/:id', jobController.getJobById);
router.put('/:id', jobController.updateJob);
router.delete('/:id', jobController.deleteJob);

export default router;
