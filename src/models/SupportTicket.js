import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    // Custom formatted ticket ID (e.g., "HP-XXXXXX")
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
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    topic: {
      type: String,
      required: [true, 'Support topic is required'],
      trim: true,
    },
    orderId: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters long'],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ userId: 1, createdAt: -1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;
