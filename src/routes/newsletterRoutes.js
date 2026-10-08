import express from 'express';
import { subscribe } from '../controllers/newsletterController.js';
import { validateNewsletter } from '../middleware/validator.js';

const router = express.Router();

router.post('/subscribe', validateNewsletter, subscribe);

export default router;
