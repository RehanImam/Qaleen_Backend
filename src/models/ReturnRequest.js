import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema(
  {
    lineId: { type: String, required: true },
    productId: { type: String, required: true },
    title: { type: String, required: true },
    image: { type: String },
    selectedSize: { type: String },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    exchangeSize: { type: String, default: null },
  },
  { _id: false }
);

const returnRequestSchema = new mongoose.Schema(
  {
    // Custom formatted return ID (e.g., "RT-XXXXXX")
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['return', 'exchange'],
      required: [true, 'Type (return or exchange) is required'],
    },
    reason: {
      type: String,
      required: [true, 'Return/exchange reason is required'],
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    pickupSlot: {
      type: Date,
      required: [true, 'Pickup slot date is required'],
    },
    items: {
      type: [returnItemSchema],
      required: true,
      validate: [(val) => val.length > 0, 'Return request must include at least one item'],
    },
    stage: {
      type: String,
      enum: ['requested', 'scheduled', 'picked', 'done'],
      default: 'requested',
      index: true,
    },
    demoStage: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
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

// Virtual for stage label
returnRequestSchema.virtual('stageLabel').get(function () {
  const labels = {
    requested: 'Requested',
    scheduled: 'Pickup scheduled',
    picked: 'Picked up',
    done: this.type === 'exchange' ? 'Exchange shipped' : 'Refund issued',
  };
  return labels[this.stage] || 'Requested';
});

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);

export default ReturnRequest;
