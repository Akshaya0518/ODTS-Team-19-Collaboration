const catalogService = require('../services/catalogService');
const { sendSuccess } = require('../utils/http');

const isAdmin = (req) => req.user?.role === 'admin';

async function listProducts(req, res) {
  const data = await catalogService.listProducts(req.valid.query, { isAdmin: isAdmin(req) });
  sendSuccess(res, { data });
}

async function getProduct(req, res) {
  const product = await catalogService.getProduct(req.valid.params.id, { isAdmin: isAdmin(req) });
  sendSuccess(res, { data: { product } });
}

async function createProduct(req, res) {
  const product = await catalogService.createProduct(req.valid.body);
  sendSuccess(res, { status: 201, message: 'Product created', data: { product } });
}

async function updateProduct(req, res) {
  const product = await catalogService.updateProduct(req.valid.params.id, req.valid.body);
  sendSuccess(res, { message: 'Product updated', data: { product } });
}

async function listCategories(req, res) {
  const categories = await catalogService.listCategories({
    includeInactive: req.valid.query.includeInactive,
    isAdmin: isAdmin(req),
  });
  sendSuccess(res, { data: { categories } });
}

async function createCategory(req, res) {
  const category = await catalogService.createCategory(req.valid.body);
  sendSuccess(res, { status: 201, message: 'Category created', data: { category } });
}

async function updateCategory(req, res) {
  const category = await catalogService.updateCategory(req.valid.params.id, req.valid.body);
  sendSuccess(res, { message: 'Category updated', data: { category } });
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
