import Review from '../models/Review.js';
import Order from '../models/Order.js';
import asyncHandler from '../middleware/asyncHandler.js';

/**
 * @desc    Get reviews for a product with rating summary
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const reviews = await Review.find({ productId: String(productId) }).sort({
    createdAt: -1,
  });

  const totalReviews = reviews.length;
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRatingSum = 0;

  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
    totalRatingSum += r.rating;
  });

  const averageRating = totalReviews > 0 ? Number((totalRatingSum / totalReviews).toFixed(1)) : 5.0;

  res.status(200).json({
    success: true,
    count: totalReviews,
    averageRating,
    ratingDistribution,
    reviews,
  });
});

/**
 * @desc    Submit a review for a product
 * @route   POST /api/reviews
 * @access  Public
 */
export const addReview = asyncHandler(async (req, res) => {
  const { productId, userId, name, rating, text } = req.body;

  // Determine verified purchase: check if any uncancelled order by this user contains this product
  let verifiedPurchase = false;
  if (userId) {
    const matchingOrder = await Order.findOne({
      userId,
      cancelledAt: null,
      'items.id': String(productId),
    });
    verifiedPurchase = Boolean(matchingOrder);
  }

  const review = await Review.create({
    productId: String(productId),
    userId: userId || null,
    name: name.trim(),
    rating: Number(rating),
    text: text.trim(),
    verifiedPurchase,
  });

  res.status(201).json({
    success: true,
    message: 'Thank you for submitting your review',
    review,
  });
});

export default {
  getProductReviews,
  addReview,
};
