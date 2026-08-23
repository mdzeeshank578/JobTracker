import express from 'express';
import { dbService } from '../services/db.js';
import { authenticateUser } from '../src/middlewares/auth.middleware.js';

const router = express.Router();

// Enforce JWT authentication middleware
router.use(authenticateUser);

// GET all jobs for authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const jobs = await dbService.getApplications(userId);
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add job for authenticated user
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { userId: bodyUserId, user_id: bodyUserId2, ...jobData } = req.body || {};
    
    if (!jobData.company && !jobData.companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const newJob = await dbService.addApplication(userId, jobData);
    res.json({ success: true, job: newJob });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update job for authenticated user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { userId: bodyUserId, user_id: bodyUserId2, company, role, status, ...updates } = req.body || {};

    const updated = await dbService.updateApplication(userId, id, company || '', role || '', status, updates);
    res.json({ success: true, job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE job for authenticated user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await dbService.deleteApplication(userId, id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
