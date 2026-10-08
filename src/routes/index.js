import express from 'express';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import addressRoutes from './addressRoutes.js';
import returnRoutes from './returnRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import supportRoutes from './supportRoutes.js';
import newsletterRoutes from './newsletterRoutes.js';
import projectRoutes from './projectRoutes.js';
import blogRoutes from './blogRoutes.js';

const router = express.Router();

router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/addresses', addressRoutes);
router.use('/returns', returnRoutes);
router.use('/reviews', reviewRoutes);
router.use('/support', supportRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/projects', projectRoutes);
router.use('/blogs', blogRoutes);

// Base API health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Qaleen Bhaiya API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

export default router;
