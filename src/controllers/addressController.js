import Address from '../models/Address.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { cleanPhone } from '../middleware/validator.js';

const generateAddressId = () =>
  `AD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/**
 * @desc    Get all addresses for a user (default first)
 * @route   GET /api/addresses/user/:userId
 * @access  Public (for now)
 */
export const getUserAddresses = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const addresses = await Address.find({ userId }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: addresses.length,
    addresses,
  });
});

/**
 * @desc    Add a new address for a user
 * @route   POST /api/addresses
 * @access  Public (for now)
 */
export const addAddress = asyncHandler(async (req, res) => {
  const {
    userId,
    label = 'Home',
    fullName,
    phone,
    address1,
    address2 = '',
    city,
    state,
    pincode,
    isDefault = false,
  } = req.body;

  const existingCount = await Address.countDocuments({ userId });
  const shouldBeDefault = existingCount === 0 || Boolean(isDefault);

  // If this address is default, unset isDefault for all other addresses of this user
  if (shouldBeDefault) {
    await Address.updateMany({ userId }, { isDefault: false });
  }

  const address = await Address.create({
    id: generateAddressId(),
    userId,
    label: ['Home', 'Work', 'Other'].includes(label) ? label : 'Home',
    fullName: fullName.trim(),
    phone: cleanPhone(phone),
    address1: address1.trim(),
    address2: (address2 || '').trim(),
    city: city.trim(),
    state: state.trim(),
    pincode: String(pincode).trim(),
    isDefault: shouldBeDefault,
  });

  res.status(201).json({
    success: true,
    address,
  });
});

/**
 * @desc    Update an existing address
 * @route   PUT /api/addresses/:id
 * @access  Public (for now)
 */
export const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    label,
    fullName,
    phone,
    address1,
    address2,
    city,
    state,
    pincode,
    isDefault,
  } = req.body;

  const address = await Address.findOne({
    $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: `Address '${id}' not found`,
    });
  }

  if (Boolean(isDefault)) {
    await Address.updateMany(
      { userId: address.userId, _id: { $ne: address._id } },
      { isDefault: false }
    );
    address.isDefault = true;
  }

  if (label) address.label = label;
  if (fullName) address.fullName = fullName.trim();
  if (phone) address.phone = cleanPhone(phone);
  if (address1) address1 = address1.trim();
  if (address2 !== undefined) address.address2 = address2.trim();
  if (city) address.city = city.trim();
  if (state) address.state = state.trim();
  if (pincode) address.pincode = String(pincode).trim();

  await address.save();

  res.status(200).json({
    success: true,
    address,
  });
});

/**
 * @desc    Delete an address
 * @route   DELETE /api/addresses/:id
 * @access  Public (for now)
 */
export const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const address = await Address.findOne({
    $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: `Address '${id}' not found`,
    });
  }

  const wasDefault = address.isDefault;
  const userId = address.userId;

  await address.deleteOne();

  // If deleted address was default, promote another address if one exists
  if (wasDefault) {
    const nextDefault = await Address.findOne({ userId }).sort({ createdAt: -1 });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully',
  });
});

/**
 * @desc    Set an address as default
 * @route   PATCH /api/addresses/:id/default
 * @access  Public (for now)
 */
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const address = await Address.findOne({
    $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: `Address '${id}' not found`,
    });
  }

  await Address.updateMany({ userId: address.userId }, { isDefault: false });
  address.isDefault = true;
  await address.save();

  res.status(200).json({
    success: true,
    message: 'Default address updated successfully',
    address,
  });
});

export default {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
