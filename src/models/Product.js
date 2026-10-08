import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    // Frontend uses a string ID (e.g., "1", "2") for URL routing and cart lines
    id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    mainGroup: {
      type: String,
      required: [true, 'Main group is required'],
      enum: ['Carpet', 'Prayer Mat', 'Wall Art', 'Custom'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Subcategory is required'],
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be positive'],
      index: true,
    },
    originalPrice: {
      type: Number,
      min: [0, 'Original price must be positive'],
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    sizes: {
      type: [String],
      default: [],
    },
    country: {
      type: String,
      trim: true,
    },
    tradition: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
      index: true,
    },
    image: {
      type: String,
      required: [true, 'Primary image URL is required'],
    },
    hoverImage: {
      type: String,
    },
    images: {
      type: [String],
      default: [],
    },
    // Detailed attributes used by MegaMenu, FilterSidebar, and ProductDetail
    attrs: {
      origin: { type: String, default: null },
      style: { type: mongoose.Schema.Types.Mixed, default: null }, // String or [String]
      material: { type: String, default: null },
      construction: { type: String, default: null },
      shape: { type: mongoose.Schema.Types.Mixed, default: null }, // String or [String]
      room: { type: [String], default: [] },
      collectionName: { type: String, default: null },
      size: { type: String, default: null },
      weight: { type: String, default: null },
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    stock: {
      type: Number,
      default: 25,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for discount percentage (mirrors frontend discountPct)
productSchema.virtual('discountPercentage').get(function () {
  if (this.originalPrice && this.price && this.originalPrice > this.price) {
    return Math.round((1 - this.price / this.originalPrice) * 100);
  }
  return null;
});

// Text index for fast multi-field search
productSchema.index({
  title: 'text',
  category: 'text',
  mainGroup: 'text',
  color: 'text',
  tradition: 'text',
  country: 'text',
});

const Product = mongoose.model('Product', productSchema);

export default Product;
