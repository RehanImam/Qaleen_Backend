import Newsletter from '../models/Newsletter.js';
import asyncHandler from '../middleware/asyncHandler.js';

/**
 * @desc    Subscribe an email to the editorial newsletter
 * @route   POST /api/newsletter/subscribe
 * @access  Public
 */
export const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  const existing = await Newsletter.findOne({ email: cleanEmail });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }
    return res.status(200).json({
      success: true,
      message: 'You are already subscribed to Qaleen Bhaiya editorial previews',
    });
  }

  await Newsletter.create({
    email: cleanEmail,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: 'Thank you for subscribing to Qaleen Bhaiya',
  });
});

export default {
  subscribe,
};
