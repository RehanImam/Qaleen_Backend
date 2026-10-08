import Order from '../models/Order.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { cleanPhone } from '../middleware/validator.js';

const FREE_SHIPPING_THRESHOLD = 1999;
const HOUR = 60 * 60 * 1000;

export const ORDER_STAGES = [
  { key: 'placed', label: 'Placed' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'outForDelivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export const DELIVERY_OPTIONS = [
  { id: 'standard', label: 'Standard Delivery', minDays: 7, maxDays: 10, price: 199 },
  { id: 'express', label: 'Express Delivery', minDays: 3, maxDays: 5, price: 499 },
];

export const COUPONS = {
  WELCOME10: { code: 'WELCOME10', percent: 10, label: '10% off your first order' },
};

// Generates custom order ID like QB-A1B2C3
const generateOrderId = () =>
  `QB-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')}`;

// Generates stable pseudo-random courier AWB from order ID
const generateAwb = (id) => {
  let h = 7;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 1000000007;
  return `58${String(h).padStart(9, '0').slice(0, 9)}`;
};

// Add business days (skipping Sundays)
const addBusinessDays = (from, days) => {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added += 1;
  }
  return d;
};

// Computes stage schedule from order creation date and delivery method
const computeSchedule = (order) => {
  const created = new Date(order.createdAt);
  const isExpress = order.delivery?.id === 'express';
  const deliveryDay = addBusinessDays(created, isExpress ? 3 : 7);

  const atHour = (date, hours, minutes = 0) => {
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  return [
    created,
    new Date(created.getTime() + (isExpress ? 4 : 24) * HOUR),
    new Date(created.getTime() + (isExpress ? 24 : 48) * HOUR),
    atHour(deliveryDay, 8, 30),
    atHour(deliveryDay, 18, 0),
  ];
};

// Compute dynamic order status, active stage, and tracking events
export const computeOrderStatus = (order, now = new Date()) => {
  const schedule = computeSchedule(order);
  const cancelled = Boolean(order.cancelledAt);
  const clock = cancelled ? new Date(order.cancelledAt) : now;
  const demoTimes = order.demoTimes instanceof Map ? Object.fromEntries(order.demoTimes) : (order.demoTimes || {});

  let byTime = 0;
  schedule.forEach((at, i) => {
    if (at <= clock) byTime = i;
  });

  const stageIndex = Math.max(byTime, cancelled ? 0 : order.demoStage || 0);

  const stages = ORDER_STAGES.map((stage, i) => {
    const reached = i <= stageIndex;
    const reachedAt =
      reached && demoTimes[stage.key] && new Date(demoTimes[stage.key]) < schedule[i]
        ? new Date(demoTimes[stage.key])
        : schedule[i];
    return { ...stage, at: reachedAt, reached };
  });

  const delivered = !cancelled && stageIndex === ORDER_STAGES.length - 1;
  const deliveredAt = delivered ? stages[4].at : null;

  // Build event timeline log
  const city = order.shipping?.city || 'your city';
  const detailMap = {
    placed: 'We received your order and payment details.',
    packed: 'Packed and quality checked at our Bhadohi warehouse.',
    shipped: `Handed to BlueDart. Tracking number ${order.awb || generateAwb(order.id)}.`,
    outForDelivery: `Out for delivery in ${city}.`,
    delivered: `Delivered to ${order.shipping?.fullName || 'you'}.`,
  };

  const events = stages
    .filter((s) => s.reached)
    .map((s) => ({
      key: s.key,
      label: s.label,
      detail: detailMap[s.key],
      at: s.at,
    }));

  if (cancelled) {
    events.push({
      key: 'cancelled',
      label: 'Cancelled',
      detail: order.cancelReason ? `Reason: ${order.cancelReason}.` : 'Your order was cancelled.',
      at: new Date(order.cancelledAt),
    });
  }

  events.reverse();

  return {
    stages,
    stageIndex,
    currentStage: cancelled ? 'cancelled' : ORDER_STAGES[stageIndex].key,
    currentStageLabel: cancelled ? 'Cancelled' : ORDER_STAGES[stageIndex].label,
    cancelled,
    delivered,
    deliveredAt,
    eta: schedule[4],
    canCancel: !cancelled && stageIndex < 2,
    awb: order.awb || generateAwb(order.id),
    events,
  };
};

/**
 * @desc    Create a new order (Checkout)
 * @route   POST /api/orders
 * @access  Public
 */
export const createOrder = asyncHandler(async (req, res) => {
  const {
    id, // optional: client can provide generated ID or server will assign one
    items,
    contact,
    shipping,
    delivery,
    payment,
    coupon,
    userId = null,
  } = req.body;

  // Calculate pricing server-side to guarantee integrity
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

  const deliveryOption =
    DELIVERY_OPTIONS.find((d) => d.id === delivery?.id) || DELIVERY_OPTIONS[0];

  const shippingCost =
    deliveryOption.id === 'standard' && subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : deliveryOption.price;

  let discount = 0;
  if (coupon && COUPONS[coupon.toUpperCase()]) {
    const couponInfo = COUPONS[coupon.toUpperCase()];
    discount = Math.round((subtotal * couponInfo.percent) / 100);
  }

  const total = Math.max(0, subtotal - discount + shippingCost);

  const orderId = (id && String(id).trim().toUpperCase()) || generateOrderId();
  const awb = generateAwb(orderId);

  const order = await Order.create({
    id: orderId,
    userId: userId || null,
    items: items.map((i) => ({
      id: String(i.id),
      title: i.title,
      image: i.image,
      price: i.price,
      selectedSize: i.selectedSize || '',
      qty: i.qty || 1,
      lineId: i.lineId || `${i.id}-${i.selectedSize || 'default'}`,
    })),
    contact: {
      email: contact.email.trim().toLowerCase(),
      phone: cleanPhone(contact.phone),
      updates: contact.updates !== false,
    },
    shipping: {
      fullName: shipping.fullName.trim(),
      address1: shipping.address1.trim(),
      address2: (shipping.address2 || '').trim(),
      city: shipping.city.trim(),
      state: shipping.state.trim(),
      pincode: String(shipping.pincode).trim(),
    },
    delivery: {
      id: deliveryOption.id,
      label: deliveryOption.label,
      window: delivery?.window || '',
    },
    payment: {
      method: payment.method,
      label: payment.label || (payment.method === 'cod' ? 'Cash on Delivery' : payment.method.toUpperCase()),
      isPaid: payment.method !== 'cod',
      paidAt: payment.method !== 'cod' ? new Date() : null,
    },
    coupon: coupon || null,
    totals: {
      subtotal,
      discount,
      shipping: shippingCost,
      total,
    },
    stage: 'placed',
    awb,
  });

  const status = computeOrderStatus(order);

  res.status(201).json({
    success: true,
    order,
    status,
  });
});

/**
 * @desc    Get order details by order ID with real-time tracking calculation
 * @route   GET /api/orders/:id
 * @access  Public
 */
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({ id: id.trim().toUpperCase() });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: `Order '${id}' not found`,
    });
  }

  const status = computeOrderStatus(order);

  res.status(200).json({
    success: true,
    order,
    status,
  });
});

/**
 * @desc    Track order for guests by order ID + email or mobile
 * @route   POST /api/orders/track
 * @access  Public
 */
export const trackOrder = asyncHandler(async (req, res) => {
  const { orderId, contact } = req.body;

  if (!orderId || !contact) {
    return res.status(400).json({
      success: false,
      message: 'Both Order ID and contact (email or phone) are required',
    });
  }

  const order = await Order.findOne({ id: orderId.trim().toUpperCase() });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'No order found with the provided details',
    });
  }

  const contactVal = String(contact).trim().toLowerCase();
  const digits = cleanPhone(contactVal);
  const emailMatch = contactVal.includes('@') && order.contact?.email?.toLowerCase() === contactVal;
  const phoneMatch = digits.length === 10 && cleanPhone(order.contact?.phone) === digits;

  if (!emailMatch && !phoneMatch) {
    return res.status(404).json({
      success: false,
      message: 'Contact information does not match the order records',
    });
  }

  const status = computeOrderStatus(order);

  res.status(200).json({
    success: true,
    order,
    status,
  });
});

/**
 * @desc    Get all orders for a specific user
 * @route   GET /api/orders/user/:userId
 * @access  Public (for now)
 */
export const getUserOrders = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const orders = await Order.find({ userId }).sort({ createdAt: -1 });

  const enrichedOrders = orders.map((order) => {
    const status = computeOrderStatus(order);
    return {
      ...order.toObject(),
      status,
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedOrders.length,
    orders: enrichedOrders,
  });
});

/**
 * @desc    Cancel an order before shipping
 * @route   POST /api/orders/:id/cancel
 * @access  Public
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Order.findOne({ id: id.trim().toUpperCase() });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: `Order '${id}' not found`,
    });
  }

  const currentStatus = computeOrderStatus(order);

  if (!currentStatus.canCancel) {
    return res.status(400).json({
      success: false,
      message: 'Order cannot be cancelled because it is already shipped or cancelled',
    });
  }

  order.cancelledAt = new Date();
  order.cancelReason = reason || 'Cancelled by customer';
  await order.save();

  const updatedStatus = computeOrderStatus(order);

  res.status(200).json({
    success: true,
    message: 'Order has been successfully cancelled',
    order,
    status: updatedStatus,
  });
});

/**
 * @desc    Advance demo stage for testing order lifecycle (matches frontend demo control)
 * @route   POST /api/orders/:id/advance-demo
 * @access  Public
 */
export const advanceOrderDemo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({ id: id.trim().toUpperCase() });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: `Order '${id}' not found`,
    });
  }

  if (order.cancelledAt) {
    return res.status(400).json({
      success: false,
      message: 'Cannot advance a cancelled order',
    });
  }

  const status = computeOrderStatus(order);
  const nextStageIndex = Math.min(status.stageIndex + 1, ORDER_STAGES.length - 1);
  const nextStageKey = ORDER_STAGES[nextStageIndex].key;

  order.demoStage = nextStageIndex;
  order.stage = nextStageKey;

  const currentDemoTimes = order.demoTimes instanceof Map ? Object.fromEntries(order.demoTimes) : (order.demoTimes || {});
  currentDemoTimes[nextStageKey] = new Date().toISOString();
  order.demoTimes = currentDemoTimes;

  if (nextStageKey === 'delivered' && !order.deliveredAt) {
    order.deliveredAt = new Date();
  }

  await order.save();

  const updatedStatus = computeOrderStatus(order);

  res.status(200).json({
    success: true,
    message: `Order advanced to stage: ${ORDER_STAGES[nextStageIndex].label}`,
    order,
    status: updatedStatus,
  });
});

export default {
  createOrder,
  getOrderById,
  trackOrder,
  getUserOrders,
  cancelOrder,
  advanceOrderDemo,
};
