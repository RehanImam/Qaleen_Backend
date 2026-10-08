import express from 'express';
import {
  getBlogPosts,
  getBlogPostBySlug,
  seedBlogPosts,
} from '../controllers/blogController.js';

const router = express.Router();

router.get('/', getBlogPosts);
router.post('/seed', seedBlogPosts);
router.get('/:slug', getBlogPostBySlug);

export default router;
