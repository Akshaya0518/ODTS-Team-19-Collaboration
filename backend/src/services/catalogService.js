/**
 * Products and categories.
 * Public visitors only see ACTIVE items; admins can also see inactive ones.
 */
const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const { getPagination, paginated, escapeRegex } = require('../utils/http');

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name: { name: 1 },
};

async function listProducts(query, { isAdmin = false } = {}) {
  const filter = {};
  if (!(isAdmin && query.includeInactive === 'true')) filter.isActive = true;
  if (query.category) filter.category = query.category;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }
  const pg = getPagination(query);
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name isActive')
      .sort(SORTS[query.sort] || SORTS.newest)
      .skip(pg.skip)
      .limit(pg.limit),
    Product.countDocuments(filter),
  ]);
  return paginated(items, total, pg);
}

async function getProduct(id, { isAdmin = false } = {}) {
  const product = await Product.findById(id).populate('category', 'name isActive');
  if (!product || (!product.isActive && !isAdmin)) throw ApiError.notFound('Product not found');
  return product;
}

async function assertCategoryUsable(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) throw ApiError.badRequest('Selected category does not exist');
  if (!category.isActive) throw ApiError.badRequest('Selected category is inactive');
}

async function createProduct(data) {
  await assertCategoryUsable(data.category);
  const product = await Product.create(data);
  return product.populate('category', 'name isActive');
}

async function updateProduct(id, data) {
  if (data.category) await assertCategoryUsable(data.category);
  const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
    'category',
    'name isActive'
  );
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function listCategories({ includeInactive, isAdmin = false }) {
  const filter = isAdmin && includeInactive === 'true' ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ name: 1 }).lean();
  // Attach how many active products each category has (useful for the admin table).
  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.count]));
  return categories.map((c) => ({ ...c, productCount: byId.get(String(c._id)) || 0 }));
}

async function createCategory(data) {
  return Category.create(data);
}

async function updateCategory(id, data) {
  const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  listCategories,
  createCategory,
  updateCategory,
};
