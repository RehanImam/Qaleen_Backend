import mongoose from 'mongoose';

const projectSpecsSchema = new mongoose.Schema(
  {
    material: { type: String, default: '' },
    size: { type: String, default: '' },
    timeline: { type: String, default: '' },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required (carpets, frames, walls)'],
      enum: ['carpets', 'frames', 'walls'],
      index: true,
    },
    categoryLabel: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
    },
    specs: {
      type: projectSpecsSchema,
      default: () => ({}),
    },
    waMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model('Project', projectSchema);

export default Project;
