import Product from '../models/Product.js';
import asyncHandler from '../middleware/asyncHandler.js';

// Color families matching frontend shopFilters.js
const COLOUR_FAMILIES = {
  'White / Ivory': ['Cream', 'Ivory'],
  Beige: ['Cream', 'Sand Beige'],
  Black: ['Charcoal'],
  Grey: ['Stone Grey'],
  Brown: ['Walnut Brown'],
  Blue: ['Navy Blue'],
  Red: ['Burgundy'],
  Green: ['Olive Green'],
  Yellow: ['Mustard'],
  Orange: ['Terracotta'],
  Pink: ['Blush Pink'],
  Multicolor: ['Multicolour'],
};

/**
 * @desc    Get all products with multi-dimensional filtering, search, sorting & pagination
 * @route   GET /api/products
 * @access  Public
 */
export const getProducts = asyncHandler(async (req, res) => {
  const {
    mainGroup,
    category,
    size,
    color,
    maxPrice,
    search,
    sortBy = 'featured',
    page = 1,
    limit = 40,
  } = req.query;

  const query = {};

  // Main group filter (Carpet, Prayer Mat, Wall Art, Custom)
  if (mainGroup) {
    query.mainGroup = new RegExp(`^${mainGroup.trim()}$`, 'i');
  }

  // Category / Item filter
  if (category) {
    query.$or = [
      { category: new RegExp(category.trim(), 'i') },
      { 'attrs.origin': new RegExp(category.trim(), 'i') },
      { 'attrs.shape': new RegExp(category.trim(), 'i') },
      { 'attrs.room': new RegExp(category.trim(), 'i') },
      { 'attrs.material': new RegExp(category.trim(), 'i') },
      { 'attrs.collectionName': new RegExp(category.trim(), 'i') },
    ];
  }

  // Size filter
  if (size) {
    const cleanSize = size.trim();
    query.$or = query.$or || [];
    query.$or.push(
      { sizes: cleanSize },
      { 'attrs.size': cleanSize }
    );
  }

  // Color filter (supports color families)
  if (color) {
    const shades = COLOUR_FAMILIES[color] || [color];
    const colorRegexes = shades.map((s) => new RegExp(`^${s}$`, 'i'));
    query.color = { $in: colorRegexes };
  }

  // Price filter
  if (maxPrice && !isNaN(Number(maxPrice))) {
    query.price = { $lte: Number(maxPrice) };
  }

  // Keyword text search
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query.$text = { $search: searchTerm };
  }

  // Sorting
  let sortOption = {};
  switch (sortBy) {
    case 'price-low':
      sortOption = { price: 1 };
      break;
    case 'price-high':
      sortOption = { price: -1 };
      break;
    case 'newest':
      sortOption = { createdAt: -1 };
      break;
    case 'rating':
      sortOption = { rating: -1 };
      break;
    case 'featured':
    default:
      sortOption = { id: 1 };
      break;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [products, totalCount] = await Promise.all([
    Product.find(query).sort(sortOption).skip(skip).limit(limitNum),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    totalCount,
    totalPages: Math.ceil(totalCount / limitNum),
    currentPage: pageNum,
    products,
  });
});

/**
 * @desc    Get single product by ID or Slug with related products
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Search by custom string id, mongo _id, or slug
  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: id }, { id }, { slug: id }] }
    : { $or: [{ id }, { slug: id }] };

  const product = await Product.findOne(query);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: `Product with identifier '${id}' not found`,
    });
  }

  // Fetch up to 4 related products in the same category or mainGroup
  const relatedProducts = await Product.find({
    id: { $ne: product.id },
    $or: [{ category: product.category }, { mainGroup: product.mainGroup }],
  })
    .limit(4)
    .select('id title price originalPrice rating image hoverImage sizes color category mainGroup');

  res.status(200).json({
    success: true,
    product,
    relatedProducts,
  });
});

/**
 * @desc    Get dynamic filter options, collections, and price range
 * @route   GET /api/products/meta/filters
 * @access  Public
 */
export const getFilterOptions = asyncHandler(async (req, res) => {
  const { mainGroup } = req.query;
  const match = mainGroup ? { mainGroup: new RegExp(`^${mainGroup}$`, 'i') } : {};

  const [categories, colors, sizes, priceStats] = await Promise.all([
    Product.distinct('category', match),
    Product.distinct('color', match),
    Product.distinct('sizes', match),
    Product.aggregate([
      ...(mainGroup ? [{ $match: match }] : []),
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          totalProducts: { $sum: 1 },
        },
      },
    ]),
  ]);

  const stats = priceStats[0] || { minPrice: 0, maxPrice: 50000, totalProducts: 0 };

  res.status(200).json({
    success: true,
    filters: {
      categories: categories.filter(Boolean).sort(),
      colors: colors.filter(Boolean).sort(),
      sizes: sizes.filter(Boolean).sort(),
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      totalProducts: stats.totalProducts,
    },
  });
});

/**
 * @desc    Seed initial catalog data from generator if database is empty
 * @route   POST /api/products/seed
 * @access  Public
 */
export const seedProducts = asyncHandler(async (req, res) => {
  const existingCount = await Product.countDocuments();
  if (existingCount > 0 && !req.query.force) {
    return res.status(200).json({
      success: true,
      message: `Database already contains ${existingCount} products. Use ?force=true to re-seed.`,
      count: existingCount,
    });
  }

  if (req.query.force) {
    await Product.deleteMany({});
  }

  // Generate dataset matching frontend data generator
  const SUB_CATEGORIES = {
    Carpet: [
      'Irregular Shaped Carpets',
      'Shaggy Carpets',
      'Jute Carpet & Rugs',
      'Round Rugs Carpets',
      'Round Shaggy Carpet',
      'Solid Carpets',
      'Irani Carpets',
      'Modern Abstract',
      'Traditional Carpets',
      'Designer Carpets',
      'Persian Wool Rugs & Carpets',
      'Statement Carpets',
      'Hand Knotted Carpets',
      'Artificial Grass Carpets',
      'Kids Carpets',
      'Floral Carpets',
      'Geometrical Carpets',
    ],
    'Prayer Mat': [
      'Velvet Janamaz',
      'Orthopedic Padded Prayer Mat',
      'Turkish Silk Prayer Rug',
      'Travel Foldable Prayer Mat',
    ],
    'Wall Art': [
      'Handmade Wall Tapestry',
      'Framed Textile Art',
      'Vintage Carpet Art Wall Hanging',
    ],
    Custom: [
      'Bespoke Living Room Rug',
      'Custom Sized Runner',
      'Monogrammed Hand-Tufted Rug',
      'Custom Colorway Carpet',
    ],
  };

  const COUNTRIES = ['India', 'Iran', 'Turkey', 'Afghanistan'];
  const PRAYER_MAT_COUNTRIES = ['Turkey', 'Kashmir', 'Syria', 'China'];
  const TRADITIONS = {
    India: 'Indian',
    Iran: 'Persian',
    Turkey: 'Turkish',
    Afghanistan: 'Afghan',
    Kashmir: 'Kashmiri',
    Syria: 'Syrian',
    China: 'Chinese',
  };

  const CARPET_COLOURS = [
    'Ivory',
    'Sand Beige',
    'Charcoal',
    'Stone Grey',
    'Walnut Brown',
    'Navy Blue',
    'Burgundy',
    'Olive Green',
    'Mustard',
    'Terracotta',
    'Blush Pink',
    'Multicolour',
  ];

  const COLORS = [
    { name: 'Cream', hex: '#f5f5dc' },
    { name: 'Burgundy', hex: '#5c0612' },
    { name: 'Navy Blue', hex: '#1e293b' },
    { name: 'Olive Green', hex: '#556b2f' },
    { name: 'Terracotta', hex: '#e07a5f' },
  ];

  const IMAGES = [
    'https://picsum.photos/seed/u1600121848594/900/1100',
    'https://picsum.photos/seed/u1579656381226/900/1100',
    'https://picsum.photos/seed/u1584551246679/900/1100',
    'https://picsum.photos/seed/u1600166898405/900/1100',
    'https://picsum.photos/seed/u1513694203232/900/1100',
    'https://picsum.photos/seed/u1618221195710/900/1100',
    'https://picsum.photos/seed/u1615873968403/900/1100',
  ];

  const prefixes = [
    'Royal', 'Imperial', 'Grand', 'Luxury', 'Handcrafted', 'Heritage',
    'Artisan', 'Silk', 'Vintage', 'Modern', 'Classic', 'Premium', 'Opulent', 'Elite',
  ];

  const CARPET_ORIGINS = { India: 'Indian Carpets', Turkey: 'Turkish Carpets', Iran: 'Irani / Persian Carpets' };

  const CARPET_DETAILS = {
    'Irregular Shaped Carpets': { style: 'Contemporary / Modern', materials: ['Wool', 'Bamboo Silk'], shape: 'Irregular Shaped', room: ['Living Room'] },
    'Shaggy Carpets': { style: 'Contemporary / Modern', materials: ['Polyester & Acrylic', 'Wool'], room: ['Bed Room'], runner: true },
    'Jute Carpet & Rugs': { style: 'Transitional', materials: ['Jute', 'Wool & Jute'], room: ['Dining Room'], runner: true },
    'Round Rugs Carpets': { style: 'Contemporary / Modern', materials: ['Wool', 'Bamboo Silk'], shape: 'Round', room: ['Living Room'] },
    'Round Shaggy Carpet': { style: 'Contemporary / Modern', materials: ['Polyester & Acrylic', 'Wool'], shape: 'Round', room: ['Bed Room'] },
    'Solid Carpets': { style: 'Contemporary / Modern', materials: ['Wool', 'Viscose'], room: ['Bed Room', 'Dining Room'], runner: true },
    'Irani Carpets': { style: 'Traditional / Oriental', materials: ['Silk', 'Wool & Silk'], room: ['Living Room', 'Dining Room'] },
    'Modern Abstract': { style: ['Abstract', 'Contemporary / Modern'], materials: ['Wool & Viscose', 'Viscose', 'Bamboo Silk'], room: ['Living Room'] },
    'Traditional Carpets': { style: 'Traditional / Oriental', materials: ['Wool', 'Wool & Viscose'], room: ['Living Room', 'Dining Room'], runner: true },
    'Designer Carpets': { style: ['Contemporary / Modern', 'Transitional'], materials: ['Wool & Viscose', 'Wool & Bamboo Silk'], room: ['Living Room'] },
    'Persian Wool Rugs & Carpets': { style: 'Traditional / Oriental', materials: ['Wool', 'Wool & Silk'], room: ['Living Room'] },
    'Statement Carpets': { style: 'Contemporary / Modern', materials: ['Viscose', 'Wool & Bamboo Silk'], room: ['Living Room'] },
    'Hand Knotted Carpets': { style: 'Traditional / Oriental', materials: ['Wool & Silk', 'Wool', 'Silk'], room: ['Living Room'] },
    'Artificial Grass Carpets': { style: 'Contemporary / Modern', materials: ['Polyester & Acrylic'], room: ['Living Room'] },
    'Kids Carpets': { style: 'Contemporary / Modern', materials: ['Polyester & Acrylic'], room: ['Bed Room'] },
    'Floral Carpets': { style: 'Transitional', materials: ['Wool & Viscose', 'Bamboo Silk'], room: ['Bed Room'] },
    'Geometrical Carpets': { style: 'Contemporary / Modern', materials: ['Wool', 'Wool & Bamboo Silk'], room: ['Living Room', 'Dining Room'], runner: true },
  };

  const PRAYER_MAT_DETAILS = {
    'Velvet Janamaz': { material: 'Viscose', weight: 'Lightweight' },
    'Orthopedic Padded Prayer Mat': { material: 'Polyester', construction: 'Normal / Standard Finish', weight: 'Heavyweight' },
    'Turkish Silk Prayer Rug': { material: 'Bamboo Silk', construction: 'Hand Tufted', weight: 'Heavyweight' },
    'Travel Foldable Prayer Mat': { material: 'Polyester', construction: 'Digital Printed', weight: 'Lightweight' },
  };

  const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  const items = [];
  let idCounter = 1;

  for (const mainGroup of Object.keys(SUB_CATEGORIES)) {
    const subCats = SUB_CATEGORIES[mainGroup];

    for (const subCat of subCats) {
      const countries = mainGroup === 'Prayer Mat' ? PRAYER_MAT_COUNTRIES : COUNTRIES;

      for (const country of countries) {
        for (let colorIdx = 0; colorIdx < COLORS.length; colorIdx++) {
          const colorObj = COLORS[colorIdx];
          const prefix = prefixes[(idCounter + colorIdx) % prefixes.length];

          let basePrice = 12000;
          if (mainGroup === 'Prayer Mat') basePrice = 2500;
          if (mainGroup === 'Wall Art') basePrice = 18000;
          if (mainGroup === 'Custom') basePrice = 22000;

          const price = basePrice + ((idCounter * 17) % 15000);
          const originalPrice = price + 3500 + ((idCounter * 23) % 8000);
          const rating = idCounter % 2 === 0 ? 5 : 4;

          const sizeList =
            mainGroup === 'Prayer Mat'
              ? ['6x8', '6x9', '7x8', '7x10', '8x10', '9x12']
              : ['2x6', '3x5', '4x5', '4x6', '5x7', '5x8', '6x7'];

          const imgIndex = (idCounter - 1) % IMAGES.length;
          const primaryImage = IMAGES[imgIndex];
          const secondaryImage = IMAGES[(imgIndex + 1) % IMAGES.length];
          const tertiaryImage = IMAGES[(imgIndex + 2) % IMAGES.length];

          let attrs = {};
          if (mainGroup === 'Carpet' && CARPET_DETAILS[subCat]) {
            const d = CARPET_DETAILS[subCat];
            const isRunner = Boolean(d.runner) && colorIdx === 2;
            attrs = {
              origin: CARPET_ORIGINS[country] || null,
              style: d.style,
              material: d.materials[colorIdx % d.materials.length],
              construction: subCat === 'Hand Knotted Carpets' ? 'Hand Knotted' : 'Hand Tufted',
              shape: [...asList(d.shape), ...(isRunner ? ['Bedside Runners'] : [])],
              room: [...d.room, ...(isRunner ? ['Corridors'] : [])],
            };
          } else if (mainGroup === 'Prayer Mat' && PRAYER_MAT_DETAILS[subCat]) {
            const base = PRAYER_MAT_DETAILS[subCat];
            attrs = {
              origin: `${TRADITIONS[country]} Prayer Mats`,
              collectionName:
                subCat === 'Velvet Janamaz'
                  ? 'Kohinoor Collection'
                  : colorIdx % 2 === 0
                  ? 'Rawdah Inspired'
                  : 'Couple Prayer Mats',
              material: base.material,
              construction: base.construction || (colorIdx % 2 === 0 ? 'Digital Printed' : 'Foil Printed'),
              shape: subCat !== 'Travel Foldable Prayer Mat' && colorIdx % 2 === 1 ? 'Dome Shaped' : 'Rectangular',
              size: colorIdx === 4 ? 'Kids' : 'Adult',
              weight: base.weight,
            };
          }

          const productTitle = `${prefix} ${TRADITIONS[country]} ${subCat}`;
          const slug = `${productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idCounter}`;

          items.push({
            id: String(idCounter),
            title: productTitle,
            slug,
            mainGroup,
            category: subCat,
            price,
            originalPrice,
            rating,
            sizes: sizeList,
            country,
            tradition: TRADITIONS[country],
            color:
              mainGroup === 'Carpet'
                ? CARPET_COLOURS[(idCounter * 7 + colorIdx) % CARPET_COLOURS.length]
                : colorObj.name,
            image: primaryImage,
            hoverImage: secondaryImage,
            images: [primaryImage, secondaryImage, tertiaryImage],
            attrs,
          });

          idCounter++;
        }
      }
    }
  }

  await Product.insertMany(items);

  res.status(201).json({
    success: true,
    message: `Successfully seeded ${items.length} products into the catalog`,
    count: items.length,
  });
});

export default {
  getProducts,
  getProductById,
  getFilterOptions,
  seedProducts,
};
