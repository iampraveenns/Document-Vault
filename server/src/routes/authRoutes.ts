import { Router } from 'express';
import { authController } from '../controllers/authController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

// Public auth routes
router.post('/signup', (req, res, next) => authController.signup(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));

// Protected auth route
router.get('/me', requireAuth, (req, res, next) => authController.getMe(req, res, next));

export default router;
