import Project from '../models/Project.js';
import asyncHandler from '../middleware/asyncHandler.js';

/**
 * @desc    Get bespoke showcase projects (with category filter)
 * @route   GET /api/projects
 * @access  Public
 */
export const getProjects = asyncHandler(async (req, res) => {
  const { category } = req.query;

  const query = {};
  if (category && ['carpets', 'frames', 'walls'].includes(category.toLowerCase())) {
    query.category = category.toLowerCase();
  }

  const projects = await Project.find(query).sort({ id: 1 });

  res.status(200).json({
    success: true,
    count: projects.length,
    projects,
  });
});

/**
 * @desc    Get single project by ID
 * @route   GET /api/projects/:id
 * @access  Public
 */
export const getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await Project.findOne({
    $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: `Project '${id}' not found`,
    });
  }

  res.status(200).json({
    success: true,
    project,
  });
});

/**
 * @desc    Seed showcase projects
 * @route   POST /api/projects/seed
 * @access  Public
 */
export const seedProjects = asyncHandler(async (req, res) => {
  const count = await Project.countDocuments();
  if (count > 0 && !req.query.force) {
    return res.status(200).json({
      success: true,
      message: `Database already contains ${count} showcase projects`,
      count,
    });
  }

  if (req.query.force) {
    await Project.deleteMany({});
  }

  const sampleProjects = [
    {
      id: 'c1',
      category: 'carpets',
      categoryLabel: 'Custom Carpet',
      title: 'Bespoke Living Room Silk-Wool Carpet',
      location: 'Malabar Hill · Mumbai',
      images: [
        'https://picsum.photos/seed/u1600585154340/900/1100',
        'https://picsum.photos/seed/u1615873968403/900/1100',
        'https://picsum.photos/seed/u1544457070/900/1100',
      ],
      description:
        'The client required an expansive centerpiece to anchor a sea-facing double-height living room without competing with natural light. We formulated a soft champagne and slate gradient combining handspun New Zealand wool and pure mulberry silk for a subtle directional sheen that changes with the coastal afternoon sun.',
      specs: {
        material: 'Mulberry Silk & NZ Highland Wool',
        size: '16 × 12 ft (Seamless Weave)',
        timeline: '7 Weeks from Dye-Match Approval',
      },
      waMessage:
        'Hi Qaleen Bhaiya! I saw your project "Bespoke Living Room Silk-Wool Carpet - Malabar Hill" and would like to enquire about a similar custom carpet.',
    },
    {
      id: 'c2',
      category: 'carpets',
      categoryLabel: 'Custom Runner',
      title: 'Botanical Heritage Hallway Runner',
      location: 'Bandra West · Mumbai',
      images: [
        'https://picsum.photos/seed/u1583847268964/900/1100',
        'https://picsum.photos/seed/u1615873968403/900/1100',
        'https://picsum.photos/seed/u1544457070/900/1100',
      ],
      description:
        'A restored art deco bungalow corridor demanded a durable yet elegant floor runner that respected original terrazzo borders. We hand-tufted a continuous 24-foot runner utilizing natural indigo and madder root plant dyes with an organic low-profile pile that withstands heavy family footfall while dampening corridor echo.',
      specs: {
        material: '100% Hand-Dyed Bikaner Wool',
        size: '24 × 4 ft (Continuous Single Piece)',
        timeline: '4 Weeks Hand-Tufted',
      },
      waMessage:
        'Hi Qaleen Bhaiya! I saw your project "Botanical Heritage Hallway Runner - Bandra West" and would like to enquire about a custom hallway runner.',
    },
    {
      id: 'c3',
      category: 'carpets',
      categoryLabel: 'Custom Carpet',
      title: 'Sculpted High-Low Living Room Carpet',
      location: 'Jubilee Hills · Hyderabad',
      images: [
        'https://picsum.photos/seed/u1600121848594/900/1100',
        'https://picsum.photos/seed/u1615873968403/900/1100',
        'https://picsum.photos/seed/u1544457070/900/1100',
      ],
      description:
        'Working closely with the interior architect, we engineered an asymmetrical hand-sheared wool carpet to fit around custom curved Italian sectional seating. Multiple pile heights create tactile topography underfoot, catching soft ambient downlighting and creating warmth across monolithic limestone tiles.',
      specs: {
        material: 'Semi-Worsted Wool & Bamboo Silk',
        size: '18 × 14 ft (Custom Contour Cut)',
        timeline: '6 Weeks Crafting & Hand-Carving',
      },
      waMessage:
        'Hi Qaleen Bhaiya! I saw your project "Sculpted High-Low Living Room Carpet - Jubilee Hills" and would like to enquire about a custom sculpted rug.',
    },
    {
      id: 'f1',
      category: 'frames',
      categoryLabel: 'Framed Textile Art',
      title: 'Heritage Zari Tapestry in Antique Teak Frame',
      location: 'Koregaon Park · Pune',
      images: [
        'https://picsum.photos/seed/u1544457070/900/1100',
        'https://picsum.photos/seed/u1615873968403/900/1100',
      ],
      description:
        'Preserving antique Kashmiri metal thread embroidery between museum-grade UV conservation glass in a bespoke hand-planed reclaimed teak shadow box frame.',
      specs: {
        material: 'Silk Velvet & Gold Thread (Zardozi)',
        size: '48 × 36 inches',
        timeline: '3 Weeks Framing',
      },
      waMessage:
        'Hi Qaleen Bhaiya! I am interested in your Framed Textile Art project "Heritage Zari Tapestry".',
    },
    {
      id: 'w1',
      category: 'walls',
      categoryLabel: 'Wall Design',
      title: 'Acoustic Wool Wall Panel Installation',
      location: 'Aerocity · New Delhi',
      images: [
        'https://picsum.photos/seed/u1594040226829/900/1100',
        'https://picsum.photos/seed/u1600166898405/900/1100',
      ],
      description:
        'Custom modular wall-hanging acoustic tapestry spanning three stories, woven with dense undyed wool felt to reduce echo in a private boardroom.',
      specs: {
        material: '100% Pure Himalayan Wool Felt',
        size: '22 × 9 ft',
        timeline: '8 Weeks Loom Weaving',
      },
      waMessage:
        'Hi Qaleen Bhaiya! I saw your Wall Design project in Aerocity and would like to discuss an acoustic wool installation.',
    },
  ];

  await Project.insertMany(sampleProjects);

  res.status(201).json({
    success: true,
    message: `Seeded ${sampleProjects.length} showcase projects`,
    count: sampleProjects.length,
  });
});

export default {
  getProjects,
  getProjectById,
  seedProjects,
};
