import express from 'express';
import {
  getProducts,
  getProductById,
  getFilterOptions,
  seedProducts,
} from '../controllers/productController.js';

const router = express.Router();

router.get('/meta/filters', getFilterOptions);
router.post('/seed', seedProducts);
router.get('/', getProducts);
router.get('/:id', getProductById);

export default router;
