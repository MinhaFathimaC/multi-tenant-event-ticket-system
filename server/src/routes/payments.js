import express from 'express';
import { simulatePayment, getOrder, getMyTickets, paymentWebhook } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/simulate', authenticate, simulatePayment);
router.post('/webhook', paymentWebhook);
router.get('/orders/:id', authenticate, getOrder);
router.get('/my-tickets', authenticate, getMyTickets);

export default router;
