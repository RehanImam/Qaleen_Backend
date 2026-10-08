import express from 'express';
import {
  createReturn,
  getUserReturns,
  getOrderReturns,
  getReturnById,
  advanceReturnDemo,
} from '../controllers/returnController.js';

const router = express.Router();

router.post('/', createReturn);
router.get('/user/:userId', getUserReturns);
router.get('/order/:orderId', getOrderReturns);
router.get('/:id', getReturnById);
router.post('/:id/advance-demo', advanceReturnDemo);

export default router;
