/** Helpers that create test data directly in the database. */
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const Product = require('../../src/models/Product');
const { hashPassword } = require('../../src/services/authService');
const { signToken } = require('../../src/middleware/auth');

const PASSWORD = 'Test@1234';
let counter = 0;

const address = { line1: '12, Gandhi Street', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641002' };

async function createUser(overrides = {}) {
  counter += 1;
  const { password = PASSWORD, ...rest } = overrides;
  return User.create({
    name: `Test User ${counter}`,
    email: `user${counter}@example.com`,
    mobile: '9876543210',
    role: 'customer',
    address,
    passwordHash: await hashPassword(password),
    ...rest,
  });
}

/** Authorization header for a user (skips the login request to keep tests fast). */
const authHeader = (user) => ({ Authorization: `Bearer ${signToken(user)}` });

async function createCategory(overrides = {}) {
  counter += 1;
  return Category.create({ name: `Category ${counter}`, description: 'Test category', ...overrides });
}

async function createProduct(overrides = {}) {
  counter += 1;
  const category = overrides.category || (await createCategory())._id;
  return Product.create({
    name: `Product ${counter}`,
    description: 'Test product',
    price: 100,
    stock: 10,
    ...overrides,
    category,
  });
}

const shippingAddress = { recipientName: 'Test Customer', mobile: '9876543210', ...address };

module.exports = { createUser, authHeader, createCategory, createProduct, shippingAddress, address, PASSWORD };
