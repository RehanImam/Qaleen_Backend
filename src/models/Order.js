import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true, min: 0 },
    selectedSize: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1, default: 1 },
    lineId: { type: String, required: true },
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    updates: { type: Boolean, default: true },
  },
  { _id: false }
);

const shippingSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    address1: { type: String, required: true, trim: true },
    address2: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    id: { type: String, enum: ['standard', 'express'], default: 'standard' },
    label: { type: String, default: 'Standard Delivery' },
    window: { type: String },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ['card', 'upi', 'cod'], required: true },
    label: { type: String },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Custom formatted ID matching frontend generation (e.g., "QB-A1B2C3")
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(val) => val.length > 0, 'Order must contain at least one item'],
    },
    contact: {
      type: contactSchema,
      required: true,
    },
    shipping: {
      type: shippingSchema,
      required: true,
    },
    delivery: {
      type: deliverySchema,
      default: () => ({}),
    },
    payment: {
      type: paymentSchema,
      required: true,
    },
    coupon: {
      type: String,
      default: null,
      trim: true,
    },
    totals: {
      type: totalsSchema,
      required: true,
    },
    stage: {
      type: String,
      enum: ['placed', 'packed', 'shipped', 'outForDelivery', 'delivered'],
      default: 'placed',
      index: true,
    },
    awb: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
      trim: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    demoStage: {
      type: Number,
      default: 0,
      min: 0,
      max: 4,
    },
    demoTimes: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to calculate total item count
orderSchema.virtual('itemCount').get(function () {
  return (this.items || []).reduce((sum, item) => sum + (item.qty || 1), 0);
});

// Virtual to check if order can be cancelled (before shipping)
orderSchema.virtual('canCancel').get(function () {
  if (this.cancelledAt) return false;
  const stages = ['placed', 'packed', 'shipped', 'outForDelivery', 'delivered'];
  const stageIdx = Math.max(stages.indexOf(this.stage), this.demoStage || 0);
  return stageIdx < 2;
});

// Composite index for fast guest tracking lookup
orderSchema.index({ id: 1, 'contact.email': 1 });
orderSchema.index({ id: 1, 'contact.phone': 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
