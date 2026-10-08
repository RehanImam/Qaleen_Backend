import mongoose from 'mongoose';

const blogContentBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['paragraph', 'heading', 'quote'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const blogPostSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      sparse: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Blog post title is required'],
      trim: true,
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      index: true,
    },
    categoryLabel: {
      type: String,
      required: [true, 'Category display label is required'],
      trim: true,
    },
    date: {
      type: String,
      default: '',
    },
    readTime: {
      type: String,
      default: '5 MIN READ',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    heroImage: {
      type: String,
      default: '',
    },
    content: {
      type: [blogContentBlockSchema],
      default: [],
    },
    relatedProducts: {
      type: [String],
      default: [],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

blogPostSchema.index({ title: 'text', excerpt: 'text' });

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

export default BlogPost;
