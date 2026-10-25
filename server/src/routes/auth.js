import express from 'express';
import { register, login, getMe, switchDemoUser } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/switch-demo/:role', switchDemoUser);

export default router;
