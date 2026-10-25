import express from 'express';
import { getDashboardAnalytics } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.get('/dashboard', authenticate, requireRole('ORGANIZER', 'ADMIN'), getDashboardAnalytics);

export default router;
