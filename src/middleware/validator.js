/**
 * Input validation middleware for API endpoints.
 * Ensures payloads conform to QaleeN frontend specifications before hitting controllers.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;

// Helper to normalize phone digits
export const cleanPhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

export const validateOrder = (req, res, next) => {
  const { items, contact, shipping, payment } = req.body;
  const errors = {};

  if (!Array.isArray(items) || items.length === 0) {
    errors.items = 'Order must contain at least one item';
  } else {
    items.forEach((item, idx) => {
      if (!item.id) errors[`items[${idx}].id`] = 'Product ID is required';
      if (!item.title) errors[`items[${idx}].title`] = 'Product title is required';
      if (typeof item.price !== 'number' || item.price < 0) errors[`items[${idx}].price`] = 'Valid price is required';
      if (!item.qty || item.qty < 1) errors[`items[${idx}].qty`] = 'Quantity must be at least 1';
      if (!item.lineId) errors[`items[${idx}].lineId`] = 'Line ID is required';
    });
  }

  if (!contact || typeof contact !== 'object') {
    errors.contact = 'Contact information is required';
  } else {
    if (!contact.email || !EMAIL_REGEX.test(contact.email.trim())) {
      errors['contact.email'] = 'Valid email is required';
    }
    const phone = cleanPhone(contact.phone);
    if (!INDIAN_PHONE_REGEX.test(phone)) {
      errors['contact.phone'] = 'Valid 10-digit mobile number is required';
    }
  }

  if (!shipping || typeof shipping !== 'object') {
    errors.shipping = 'Shipping information is required';
  } else {
    if (!shipping.fullName || shipping.fullName.trim().length < 2) {
      errors['shipping.fullName'] = 'Full name is required';
    }
    if (!shipping.address1 || shipping.address1.trim().length < 5) {
      errors['shipping.address1'] = 'Street address must be at least 5 characters';
    }
    if (!shipping.city || !shipping.city.trim()) {
      errors['shipping.city'] = 'City is required';
    }
    if (!shipping.state || !shipping.state.trim()) {
      errors['shipping.state'] = 'State is required';
    }
    if (!shipping.pincode || !PINCODE_REGEX.test(String(shipping.pincode).trim())) {
      errors['shipping.pincode'] = 'Valid 6-digit Indian PIN code is required';
    }
  }

  if (!payment || typeof payment !== 'object') {
    errors.payment = 'Payment details are required';
  } else {
    if (!['card', 'upi', 'cod'].includes(payment.method)) {
      errors['payment.method'] = 'Payment method must be one of: card, upi, cod';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation Failed',
      errors,
    });
  }

  next();
};

export const validateAddress = (req, res, next) => {
  const { fullName, phone, address1, city, state, pincode, userId } = req.body;
  const errors = {};

  if (!userId && !req.query.userId) {
    errors.userId = 'User ID is required';
  }
  if (!fullName || String(fullName).trim().length < 2) {
    errors.fullName = 'Full name is required (at least 2 characters)';
  }
  const cleanNum = cleanPhone(phone);
  if (!INDIAN_PHONE_REGEX.test(cleanNum)) {
    errors.phone = 'Valid 10-digit mobile number is required';
  }
  if (!address1 || String(address1).trim().length < 5) {
    errors.address1 = 'Street address must be at least 5 characters';
  }
  if (!city || !String(city).trim()) {
    errors.city = 'City is required';
  }
  if (!state || !String(state).trim()) {
    errors.state = 'State is required';
  }
  if (!pincode || !PINCODE_REGEX.test(String(pincode).trim())) {
    errors.pincode = 'Valid 6-digit Indian PIN code is required';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation Failed',
      errors,
    });
  }

  next();
};

export const validateReview = (req, res, next) => {
  const { productId, name, rating, text } = req.body;
  const errors = {};

  if (!productId) errors.productId = 'Product ID is required';
  if (!name || String(name).trim().length < 2) errors.name = 'Reviewer name is required';
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    errors.rating = 'Rating must be an integer between 1 and 5';
  }
  if (!text || String(text).trim().length < 5) {
    errors.text = 'Review text must be at least 5 characters';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation Failed',
      errors,
    });
  }

  next();
};

export const validateSupportTicket = (req, res, next) => {
  const { topic, message, email, phone } = req.body;
  const errors = {};

  if (!topic || !String(topic).trim()) {
    errors.topic = 'Topic is required';
  }
  if (!message || String(message).trim().length < 10) {
    errors.message = 'Message must be at least 10 characters';
  }
  if (email && !EMAIL_REGEX.test(String(email).trim())) {
    errors.email = 'Valid email address is required';
  }
  if (phone) {
    const cleanNum = cleanPhone(phone);
    if (!INDIAN_PHONE_REGEX.test(cleanNum)) {
      errors.phone = 'Valid 10-digit mobile number is required';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation Failed',
      errors,
    });
  }

  next();
};

export const validateNewsletter = (req, res, next) => {
  const { email } = req.body;
  if (!email || !EMAIL_REGEX.test(String(email).trim())) {
    return res.status(400).json({
      success: false,
      message: 'Valid email address is required',
    });
  }
  next();
};

export default {
  validateOrder,
  validateAddress,
  validateReview,
  validateSupportTicket,
  validateNewsletter,
  cleanPhone,
};
