const { z, objectId, pagination } = require('./common');

const price = z
  .number({ invalid_type_error: 'Price must be a number' })
  .positive('Price must be greater than 0')
  .max(1000000, 'Price is too high');

const stock = z
  .number({ invalid_type_error: 'Stock must be a number' })
  .int('Stock must be a whole number')
  .min(0, 'Stock cannot be negative')
  .max(100000, 'Stock is too high');

const imageUrl = z.union([z.literal(''), z.string().trim().url('Image URL must be a valid URL').max(500)]);

const createProduct = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().trim().max(2000).optional().default(''),
  category: objectId,
  price,
  stock,
  imageUrl: imageUrl.optional().default(''),
  isActive: z.boolean().optional(),
});

const updateProduct = createProduct
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const listProductsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: objectId.optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).optional(),
  ...pagination,
});

const createCategory = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  description: z.string().trim().max(500).optional().default(''),
  isActive: z.boolean().optional(),
});

const updateCategory = createCategory
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const listCategoriesQuery = z.object({
  includeInactive: z.enum(['true', 'false']).optional(),
});

module.exports = {
  createProduct,
  updateProduct,
  listProductsQuery,
  createCategory,
  updateCategory,
  listCategoriesQuery,
};
