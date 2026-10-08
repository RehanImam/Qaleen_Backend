import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    userId: {
      type: String,
      required: [true, 'User ID is required for address'],
      index: true,
    },
    label: {
      type: String,
      enum: ['Home', 'Work', 'Other'],
      default: 'Home',
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
    },
    address1: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
    },
    address2: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'PIN code is required'],
      trim: true,
      match: [/^[1-9]\d{5}$/, 'Please enter a valid 6-digit PIN code'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Formatted address lines virtual (matches addressLines in frontend)
addressSchema.virtual('formatted').get(function () {
  const line1 = [this.address1, this.address2].filter(Boolean).join(', ');
  const line2 = `${this.city}, ${this.state} ${this.pincode}`;
  return `${line1}, ${line2}`;
});

const Address = mongoose.model('Address', addressSchema);

export default Address;
