import mongoose from 'mongoose';

const userPrefsSchema = new mongoose.Schema(
  {
    orderUpdatesWhatsApp: { type: Boolean, default: true },
    orderUpdatesEmail: { type: Boolean, default: true },
    offers: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    salt: {
      type: String,
      select: false,
    },
    provider: {
      type: String,
      enum: ['email', 'phone', 'guest'],
      default: 'email',
    },
    birthday: {
      type: String,
      default: '',
    },
    prefs: {
      type: userPrefsSchema,
      default: () => ({}),
    },
    wishlist: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
