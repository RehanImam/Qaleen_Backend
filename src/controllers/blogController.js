import BlogPost from '../models/BlogPost.js';
import Product from '../models/Product.js';
import asyncHandler from '../middleware/asyncHandler.js';

/**
 * @desc    Get blog posts with optional category filter or search
 * @route   GET /api/blogs
 * @access  Public
 */
export const getBlogPosts = asyncHandler(async (req, res) => {
  const { category, search } = req.query;

  const query = { isPublished: true };

  if (category && category !== 'all') {
    query.category = new RegExp(`^${category.trim()}$`, 'i');
  }

  if (search && search.trim()) {
    query.$or = [
      { title: new RegExp(search.trim(), 'i') },
      { excerpt: new RegExp(search.trim(), 'i') },
    ];
  }

  const posts = await BlogPost.find(query).sort({ id: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: posts.length,
    posts,
  });
});

/**
 * @desc    Get single blog post by slug with enriched related products
 * @route   GET /api/blogs/:slug
 * @access  Public
 */
export const getBlogPostBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const post = await BlogPost.findOne({ slug: slug.trim().toLowerCase(), isPublished: true });

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Article '${slug}' not found`,
    });
  }

  // Fetch related products referenced in post
  let products = [];
  if (post.relatedProducts && post.relatedProducts.length > 0) {
    products = await Product.find({
      $or: [
        { id: { $in: post.relatedProducts } },
        { category: 'Traditional Carpets' },
      ],
    })
      .limit(4)
      .select('id title price originalPrice rating image hoverImage sizes color category mainGroup');
  }

  res.status(200).json({
    success: true,
    post,
    relatedProducts: products,
  });
});

/**
 * @desc    Seed initial blog posts from frontend blogPosts.js
 * @route   POST /api/blogs/seed
 * @access  Public
 */
export const seedBlogPosts = asyncHandler(async (req, res) => {
  const count = await BlogPost.countDocuments();
  if (count > 0 && !req.query.force) {
    return res.status(200).json({
      success: true,
      message: `Database already contains ${count} blog articles`,
      count,
    });
  }

  if (req.query.force) {
    await BlogPost.deleteMany({});
  }

  const sampleBlogPosts = [
    {
      id: 1,
      slug: 'wool-vs-synthetic',
      title: 'Wool vs. Synthetic: Which Carpet Is Right for Your Living Room?',
      excerpt:
        'Understanding the key differences in durability, texture, and longevity between natural wool and synthetic fibers.',
      category: 'buying-guides',
      categoryLabel: 'BUYING GUIDES',
      date: 'OCT 12, 2026',
      readTime: '6 MIN READ',
      thumbnail: 'https://picsum.photos/seed/u1600121848594/900/1100',
      heroImage: 'https://picsum.photos/seed/u1600121848594/900/1100',
      content: [
        {
          type: 'paragraph',
          text: 'When selecting a carpet for a high-traffic area like a living room, one of the most fundamental decisions you will make is choosing between natural wool and synthetic fibers. Each material brings its own unique set of characteristics, advantages, and maintenance requirements to your space.',
        },
        { type: 'heading', text: 'The Timeless Appeal of Wool' },
        {
          type: 'paragraph',
          text: 'Natural wool has been the gold standard for rug making for centuries. Sourced primarily from sheep, it is inherently resilient, naturally stain-resistant (thanks to the lanolin coating on the fibers), and incredibly soft underfoot. Wool possesses a natural crimp, which acts like a tiny spring, allowing the carpet to bounce back even under heavy furniture or constant foot traffic.',
        },
        {
          type: 'quote',
          text: 'A well-crafted wool rug doesn’t just decorate a room; it matures with it, developing a rich patina that synthetic fibers simply cannot replicate.',
        },
        {
          type: 'paragraph',
          text: 'Furthermore, wool is an excellent insulator, helping to regulate room temperature and dampen acoustics. However, it does come with a higher initial investment and requires specific care to prevent damage from alkaline cleaning solutions or prolonged moisture exposure.',
        },
        { type: 'heading', text: 'The Practicality of Synthetics' },
        {
          type: 'paragraph',
          text: 'On the other hand, synthetic fibers, such as nylon, polyester, and polypropylene, offer incredible durability and resistance to fading. Nylon, in particular, is highly elastic and handles heavy traffic exceptionally well. These materials are generally more budget-friendly and are highly resistant to water-based stains.',
        },
        {
          type: 'paragraph',
          text: 'While synthetics have come a long way in mimicking the feel of natural wool, they often lack the same depth of color and temperature-regulating properties. For households with young children or pets prone to accidents, the easy-clean nature of synthetic fibers often makes them a highly practical choice.',
        },
        { type: 'heading', text: 'Making the Right Choice' },
        {
          type: 'paragraph',
          text: 'Ultimately, the decision rests on your lifestyle and priorities. If you are looking for an heirloom piece that will age beautifully and offer unmatched comfort, a hand-knotted wool carpet is unparalleled. If practicality, budget, and immediate stain resistance are your primary concerns, a high-quality synthetic rug may be the perfect fit for your living room.',
        },
      ],
      relatedProducts: ['1', '2', '3'],
    },
    {
      id: 2,
      slug: 'removing-pet-stains',
      title: 'The Ultimate Guide to Removing Pet Stains from Persian Rugs',
      excerpt:
        'Protect your heirloom rugs with our expert-approved methods for treating and removing stubborn pet stains without damaging the delicate fibers.',
      category: 'care-and-maintenance',
      categoryLabel: 'CARE & MAINTENANCE',
      date: 'SEP 28, 2026',
      readTime: '8 MIN READ',
      thumbnail: 'https://picsum.photos/seed/u1544457070/900/1100',
      heroImage: 'https://picsum.photos/seed/u1544457070/900/1100',
      content: [
        {
          type: 'paragraph',
          text: 'Persian rugs are renowned for their intricate designs, vibrant natural dyes, and exceptional durability. However, introducing pets into a home with heirloom carpets requires a strategic approach to maintenance. When an accident happens, time is of the essence, but the method of cleaning is even more critical.',
        },
        { type: 'heading', text: 'Act Fast, But Gently' },
        {
          type: 'paragraph',
          text: 'The first rule of treating any stain on a hand-knotted wool or silk rug is to never scrub. Scrubbing untwists the fibers, causing permanent distortion and fuzzy patches that alter how light reflects off the pile. Instead, immediately blot the area with a clean, undyed cotton towel to absorb as much liquid as possible.',
        },
        {
          type: 'quote',
          text: 'Patience is your greatest tool when treating a hand-knotted rug. Blotting requires time, but it protects the integrity of the weave.',
        },
      ],
      relatedProducts: ['4', '5'],
    },
    {
      id: 3,
      slug: 'layering-area-rugs',
      title: 'How to Beautifully Layer Area Rugs Over Wall-to-Wall Carpet',
      excerpt:
        'Add texture, color, and personality to a room by mastering the art of layering rugs over existing carpets.',
      category: 'styling-and-design',
      categoryLabel: 'STYLING & DESIGN',
      date: 'SEP 15, 2026',
      readTime: '5 MIN READ',
      thumbnail: 'https://picsum.photos/seed/u1583847268964/900/1100',
      heroImage: 'https://picsum.photos/seed/u1583847268964/900/1100',
      content: [
        {
          type: 'paragraph',
          text: 'Wall-to-wall carpeting often provides an excellent neutral base, but it can lack the personality and visual interest needed to anchor a room’s design scheme. Layering an area rug over broadloom carpet is a designer favorite technique to introduce color, define spaces in open floor plans, and add tactile depth.',
        },
        { type: 'heading', text: 'Contrast is Key' },
        {
          type: 'paragraph',
          text: 'The secret to successful layering lies in contrast, specifically regarding texture and pile height. If your base carpet is a low-pile or loop texture (like Berber), layering a plush Moroccan Beni Ourain or a thick shag rug adds a cozy, luxurious contrast.',
        },
      ],
      relatedProducts: ['6', '7'],
    },
  ];

  await BlogPost.insertMany(sampleBlogPosts);

  res.status(201).json({
    success: true,
    message: `Seeded ${sampleBlogPosts.length} editorial articles`,
    count: sampleBlogPosts.length,
  });
});

export default {
  getBlogPosts,
  getBlogPostBySlug,
  seedBlogPosts,
};
