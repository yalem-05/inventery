import { Router } from 'express';
import { getUsers, createUser } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

// Endpoint for creating a user:
// 1. Can be used by anyone to register (or by Admin to create admin/staff)
router.post('/register', createUser);
router.post('/', createUser); // POST /api/users

// 2. Protected user listing
router.get('/', authenticate, requireRole(['admin']), getUsers);

export default router;
