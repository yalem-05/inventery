import { Router } from 'express';
import { login, register, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Registration endpoints
router.post('/register', register);
router.post('/signup', register);

// Login and Profile
router.post('/login', login);
router.get('/me', authenticate, getMe);

export default router;
