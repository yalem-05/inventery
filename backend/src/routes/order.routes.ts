import { Router } from 'express';
import {
  getOrders,
  createOrder,
  updateOrderStatus,
  verifyPayment,
  submitPaymentReference,
} from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

// Orders require authenticated user (admin, staff, or customer)
router.use(authenticate);

router.get('/', getOrders);
router.post('/', createOrder);
router.patch('/:id/submit-payment', submitPaymentReference);

// Staff and Admin operations only
router.patch('/:id/status', requireRole(['admin', 'staff']), updateOrderStatus);
router.patch('/:id/verify-payment', requireRole(['admin', 'staff']), verifyPayment);

export default router;
