import express from 'express';
import { getSystemStatus, getTenants, createTenant, getUsers, runConcurrencyStressTest } from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.get('/status', getSystemStatus); // Can be inspected publicly or by admin
router.get('/tenants', authenticate, requireRole('ADMIN'), getTenants);
router.post('/tenants', authenticate, requireRole('ADMIN'), createTenant);
router.get('/users', authenticate, requireRole('ADMIN'), getUsers);
router.post('/stress-test', authenticate, requireRole('ADMIN'), runConcurrencyStressTest);

export default router;
