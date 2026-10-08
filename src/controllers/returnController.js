import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { computeOrderStatus } from './orderController.js';

const RETURN_WINDOW_DAYS = 7;
const HOUR = 60 * 60 * 1000;

export const RETURN_STAGES = {
  return: [
    { key: 'requested', label: 'Requested' },
    { key: 'scheduled', label: 'Pickup scheduled' },
    { key: 'picked', label: 'Picked up' },
    { key: 'done', label: 'Refund issued' },
  ],
  exchange: [
    { key: 'requested', label: 'Requested' },
    { key: 'scheduled', label: 'Pickup scheduled' },
    { key: 'picked', label: 'Picked up' },
    { key: 'done', label: 'Exchange shipped' },
  ],
};

const generateReturnId = () =>
  `RT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Compute status and stages for a return request
export const computeReturnStatus = (request, now = new Date()) => {
  const created = new Date(request.createdAt);
  const pickupDay = new Date(request.pickupSlot);
  pickupDay.setHours(14, 0, 0, 0);

  const schedule = [
    created,
    new Date(created.getTime() + 2 * HOUR),
    pickupDay,
    new Date(pickupDay.getTime() + 2 * 24 * HOUR),
  ];

  const demoTimes =
    request.demoTimes instanceof Map
      ? Object.fromEntries(request.demoTimes)
      : request.demoTimes || {};

  let byTime = 0;
  schedule.forEach((at, i) => {
    if (at <= now) byTime = i;
  });

  const stageIndex = Math.max(byTime, request.demoStage || 0);
  const stageDefs = RETURN_STAGES[request.type] || RETURN_STAGES.return;

  const stages = stageDefs.map((stage, i) => {
    const reached = i <= stageIndex;
    const at =
      reached && demoTimes[stage.key] && new Date(demoTimes[stage.key]) < schedule[i]
        ? new Date(demoTimes[stage.key])
        : schedule[i];
    return { ...stage, at, reached };
  });

  return {
    stages,
    stageIndex,
    currentStage: stages[stageIndex].key,
    currentStageLabel: stages[stageIndex].label,
    done: stageIndex === stages.length - 1,
  };
};

/**
 * @desc    Submit a return or exchange request
 * @route   POST /api/returns
 * @access  Public
 */
export const createReturn = asyncHandler(async (req, res) => {
  const { orderId, userId, type, reason, notes, pickupSlot, items } = req.body;

  const order = await Order.findOne({ id: orderId.trim().toUpperCase() });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: `Order '${orderId}' not found`,
    });
  }

  const orderStatus = computeOrderStatus(order);
  if (!orderStatus.delivered) {
    return res.status(400).json({
      success: false,
      message: 'Returns and exchanges open only once your order has been delivered',
    });
  }

  // Check 7-day return window from delivery date
  const deliveryDate = orderStatus.deliveredAt || order.deliveredAt || new Date(order.createdAt);
  const returnWindowExpiry = new Date(deliveryDate.getTime() + RETURN_WINDOW_DAYS * 24 * HOUR);
  if (new Date() > returnWindowExpiry) {
    return res.status(400).json({
      success: false,
      message: `The 7-day return window for this order closed on ${returnWindowExpiry.toDateString()}`,
    });
  }

  // Check for already returned quantities of items
  const existingReturns = await ReturnRequest.find({ orderId: order.id });
  const alreadyReturnedCounts = {};
  existingReturns.forEach((r) => {
    r.items.forEach((i) => {
      alreadyReturnedCounts[i.lineId] = (alreadyReturnedCounts[i.lineId] || 0) + i.qty;
    });
  });

  for (const item of items) {
    const orderLine = order.items.find((i) => i.lineId === item.lineId);
    if (!orderLine) {
      return res.status(400).json({
        success: false,
        message: `Item with line ID '${item.lineId}' was not found in this order`,
      });
    }
    const alreadyReturned = alreadyReturnedCounts[item.lineId] || 0;
    const available = orderLine.qty - alreadyReturned;
    if (item.qty > available) {
      return res.status(400).json({
        success: false,
        message: `Only ${available} unit(s) of "${orderLine.title}" are eligible for return/exchange`,
      });
    }
  }

  const returnReq = await ReturnRequest.create({
    id: generateReturnId(),
    orderId: order.id,
    userId: userId || order.userId || null,
    type,
    reason,
    notes: notes || '',
    pickupSlot: new Date(pickupSlot),
    items,
    stage: 'requested',
    demoStage: 0,
  });

  const status = computeReturnStatus(returnReq);

  res.status(201).json({
    success: true,
    message: `${type === 'exchange' ? 'Exchange' : 'Return'} request submitted successfully`,
    returnRequest: returnReq,
    status,
  });
});

/**
 * @desc    Get all return requests for a user
 * @route   GET /api/returns/user/:userId
 * @access  Public
 */
export const getUserReturns = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const returns = await ReturnRequest.find({ userId }).sort({ createdAt: -1 });

  const enrichedReturns = returns.map((r) => ({
    ...r.toObject(),
    status: computeReturnStatus(r),
  }));

  res.status(200).json({
    success: true,
    count: enrichedReturns.length,
    returns: enrichedReturns,
  });
});

/**
 * @desc    Get return requests for an order
 * @route   GET /api/returns/order/:orderId
 * @access  Public
 */
export const getOrderReturns = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const returns = await ReturnRequest.find({
    orderId: orderId.trim().toUpperCase(),
  }).sort({ createdAt: -1 });

  const enrichedReturns = returns.map((r) => ({
    ...r.toObject(),
    status: computeReturnStatus(r),
  }));

  res.status(200).json({
    success: true,
    count: enrichedReturns.length,
    returns: enrichedReturns,
  });
});

/**
 * @desc    Get single return request by ID
 * @route   GET /api/returns/:id
 * @access  Public
 */
export const getReturnById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const returnReq = await ReturnRequest.findOne({ id: id.trim().toUpperCase() });
  if (!returnReq) {
    return res.status(404).json({
      success: false,
      message: `Return request '${id}' not found`,
    });
  }

  const status = computeReturnStatus(returnReq);

  res.status(200).json({
    success: true,
    returnRequest: returnReq,
    status,
  });
});

/**
 * @desc    Advance demo stage for return/exchange tracking
 * @route   POST /api/returns/:id/advance-demo
 * @access  Public
 */
export const advanceReturnDemo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const returnReq = await ReturnRequest.findOne({ id: id.trim().toUpperCase() });
  if (!returnReq) {
    return res.status(404).json({
      success: false,
      message: `Return request '${id}' not found`,
    });
  }

  const status = computeReturnStatus(returnReq);
  const stages = RETURN_STAGES[returnReq.type] || RETURN_STAGES.return;
  const nextStageIndex = Math.min(status.stageIndex + 1, stages.length - 1);
  const nextStageKey = stages[nextStageIndex].key;

  returnReq.demoStage = nextStageIndex;
  returnReq.stage = nextStageKey;

  const currentDemoTimes =
    returnReq.demoTimes instanceof Map
      ? Object.fromEntries(returnReq.demoTimes)
      : returnReq.demoTimes || {};
  currentDemoTimes[nextStageKey] = new Date().toISOString();
  returnReq.demoTimes = currentDemoTimes;

  await returnReq.save();

  const updatedStatus = computeReturnStatus(returnReq);

  res.status(200).json({
    success: true,
    message: `Return request advanced to: ${stages[nextStageIndex].label}`,
    returnRequest: returnReq,
    status: updatedStatus,
  });
});

export default {
  createReturn,
  getUserReturns,
  getOrderReturns,
  getReturnById,
  advanceReturnDemo,
};
