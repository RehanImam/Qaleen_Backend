import SupportTicket from '../models/SupportTicket.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { cleanPhone } from '../middleware/validator.js';

const generateTicketId = () =>
  `HP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/**
 * @desc    Submit a support ticket or contact message
 * @route   POST /api/support/tickets
 * @access  Public
 */
export const createTicket = asyncHandler(async (req, res) => {
  const { userId, name, email, phone, topic, orderId, message } = req.body;

  const ticket = await SupportTicket.create({
    id: generateTicketId(),
    userId: userId || null,
    name: name ? name.trim() : '',
    email: email ? email.trim().toLowerCase() : '',
    phone: phone ? cleanPhone(phone) : null,
    topic: topic.trim(),
    orderId: orderId ? orderId.trim().toUpperCase() : null,
    message: message.trim(),
    status: 'open',
  });

  res.status(201).json({
    success: true,
    message: 'Your inquiry has been received. Our concierge team will reply within 24 hours.',
    ticket,
  });
});

/**
 * @desc    Get support tickets for a user
 * @route   GET /api/support/tickets/user/:userId
 * @access  Public
 */
export const getUserTickets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const tickets = await SupportTicket.find({ userId }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: tickets.length,
    tickets,
  });
});

export default {
  createTicket,
  getUserTickets,
};
