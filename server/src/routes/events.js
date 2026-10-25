import express from 'express';
import { getEvents, getEventById, createEvent, updateEvent, deleteEvent } from '../controllers/eventController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Public routes (read-heavy, cached in Redis)
router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes (Organizer & Admin)
router.post('/', authenticate, requireRole('ORGANIZER', 'ADMIN'), createEvent);
router.put('/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), updateEvent);
router.delete('/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), deleteEvent);

export default router;
