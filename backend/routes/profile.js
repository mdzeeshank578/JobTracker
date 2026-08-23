import express from 'express';
import { dbService } from '../services/db.js';
import { authenticateUser } from '../src/middlewares/auth.middleware.js';

const router = express.Router();

// Enforce JWT authentication middleware
router.use(authenticateUser);

// GET candidate profile
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await dbService.getProfile(userId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / PUT update candidate profile
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = { ...(req.body || {}) };
    delete profileData.userId;
    delete profileData.user_id;

    const saved = await dbService.saveProfile(userId, profileData);
    res.json({ success: true, profile: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
