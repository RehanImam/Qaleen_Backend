import express from 'express';
import {
  createTicket,
  getUserTickets,
} from '../controllers/supportController.js';
import { validateSupportTicket } from '../middleware/validator.js';

const router = express.Router();

router.post('/tickets', validateSupportTicket, createTicket);
router.get('/tickets/user/:userId', getUserTickets);

export default router;
