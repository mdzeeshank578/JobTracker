import express from 'express';
import { profileController } from '../controllers/profile.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Enforce JWT authentication middleware on all profile routes
router.use(authenticateUser);

router.get('/', profileController.getProfile);
router.post('/', profileController.updateProfile);
router.put('/', profileController.updateProfile);

export default router;
