import express from 'express';
import { holdTickets, getActiveReservation, cancelReservation, manualPurgeExpired } from '../controllers/reservationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/hold', authenticate, holdTickets);
router.get('/active', authenticate, getActiveReservation);
router.delete('/:id', authenticate, cancelReservation);
router.post('/cleanup', manualPurgeExpired);

export default router;
