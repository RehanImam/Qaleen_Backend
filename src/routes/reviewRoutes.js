import express from 'express';
import {
  getProductReviews,
  addReview,
} from '../controllers/reviewController.js';
import { validateReview } from '../middleware/validator.js';

const router = express.Router();

router.get('/product/:productId', getProductReviews);
router.post('/', validateReview, addReview);

export default router;
