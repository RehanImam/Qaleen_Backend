import express from 'express';
import {
  createOrder,
  getOrderById,
  trackOrder,
  getUserOrders,
  cancelOrder,
  advanceOrderDemo,
} from '../controllers/orderController.js';
import { validateOrder } from '../middleware/validator.js';

const router = express.Router();

router.post('/', validateOrder, createOrder);
router.post('/track', trackOrder);
router.get('/user/:userId', getUserOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/advance-demo', advanceOrderDemo);

export default router;
