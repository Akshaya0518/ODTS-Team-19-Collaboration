/**
 * DEMO DATA SEED SCRIPT (development only)
 *
 *   npm run seed         -> adds/updates demo users, categories and products (safe to run again)
 *   npm run seed:reset   -> DELETES all ODTS data first, then seeds (use before a fresh demo)
 *
 * Demo account emails/passwords are read from backend/.env (see .env.example),
 * so no credentials are hardcoded in this file.
 */
const mongoose = require('mongoose');
const { config, validateEnv } = require('../config/env');
const { connectDB } = require('../config/db');
const { hashPassword } = require('../services/authService');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');

const CATEGORIES = [
  { name: 'Electronics', description: 'Phones, audio and everyday gadgets' },
  { name: 'Home & Kitchen', description: 'Cookware, storage and home essentials' },
  { name: 'Books & Stationery', description: 'Books, notebooks and study supplies' },
  { name: 'Personal Care', description: 'Grooming and wellness products' },
  { name: 'Sports & Fitness', description: 'Equipment for an active lifestyle' },
];

const PRODUCTS = [
  ['Electronics', 'Wireless Bluetooth Earbuds', 'Bluetooth 5.3 earbuds with 30-hour battery life and a charging case.', 1499, 40],
  ['Electronics', 'Fast Charger 20W USB-C', 'Compact 20W USB-C charger with over-heat protection.', 799, 60],
  ['Electronics', 'Portable Power Bank 10000mAh', 'Slim 10000mAh power bank with dual USB outputs.', 1199, 35],
  ['Electronics', 'Smart Fitness Band', 'Heart-rate, step and sleep tracking with a 14-day battery.', 2499, 25],
  ['Home & Kitchen', 'Stainless Steel Water Bottle 1L', 'Insulated bottle that keeps drinks cold for 24 hours.', 599, 80],
  ['Home & Kitchen', 'Non-Stick Tawa 28cm', 'Induction-friendly non-stick tawa for dosa and chapati.', 899, 30],
  ['Home & Kitchen', 'Airtight Storage Containers (Set of 6)', 'BPA-free containers for grains, pulses and snacks.', 749, 45],
  ['Home & Kitchen', 'Electric Kettle 1.5L', 'Auto shut-off kettle with a stainless steel body.', 1099, 20],
  ['Books & Stationery', 'Data Structures Made Simple', 'Beginner-friendly guide to arrays, trees, graphs and more.', 450, 50],
  ['Books & Stationery', 'A5 Ruled Notebook (Pack of 4)', '200-page notebooks with thick, smooth paper.', 320, 100],
  ['Books & Stationery', 'Gel Pen Set (10 colours)', 'Smooth-writing 0.5mm gel pens in assorted colours.', 199, 120],
  ['Personal Care', 'Herbal Face Wash 150ml', 'Neem and aloe vera face wash for daily use.', 249, 70],
  ['Personal Care', 'Cordless Beard Trimmer', 'USB-rechargeable trimmer with 20 length settings.', 1299, 18],
  ['Sports & Fitness', 'Yoga Mat 6mm', 'Anti-slip yoga mat with a carry strap.', 699, 40],
  ['Sports & Fitness', 'Adjustable Skipping Rope', 'Tangle-free rope with ball bearings and foam handles.', 299, 65],
  ['Sports & Fitness', 'Cricket Tennis Ball (Pack of 6)', 'Durable rubber balls for street and turf cricket.', 360, 3],
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in backend/.env (see .env.example)`);
  return value;
}

async function upsertUser({ email, password, ...rest }) {
  const passwordHash = await hashPassword(password);
  const user = (await User.findOne({ email: email.toLowerCase() })) || new User({ email });
  user.set({ ...rest, passwordHash, isActive: true });
  return user.save(); // runs the schema validation too
}

async function seed() {
  if (config.isProduction) throw new Error('Refusing to seed demo data when NODE_ENV=production.');
  validateEnv();
  await connectDB(config.mongoUri);

  if (process.argv.includes('--reset')) {
    console.log('Reset requested: deleting existing ODTS data...');
    await Promise.all(
      [User, Category, Product, Order, Delivery, Notification, Counter].map((M) => M.deleteMany({}))
    );
  }
  // Make sure all indexes (unique email, order ID, etc.) exist.
  await Promise.all([User, Category, Product, Order, Delivery, Notification].map((M) => M.syncIndexes()));

  const address = { line1: '12, Gandhi Street, RS Puram', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641002' };
  const users = [
    { email: requireEnv('SEED_ADMIN_EMAIL'), password: requireEnv('SEED_ADMIN_PASSWORD'), name: 'Demo Admin', mobile: '9876500001', role: 'admin' },
    { email: requireEnv('SEED_CUSTOMER_EMAIL'), password: requireEnv('SEED_CUSTOMER_PASSWORD'), name: 'Arun Kumar', mobile: '9876500002', role: 'customer', address },
    { email: requireEnv('SEED_DELIVERY1_EMAIL'), password: requireEnv('SEED_DELIVERY_PASSWORD'), name: 'Ravi Shankar', mobile: '9876500003', role: 'delivery' },
    { email: requireEnv('SEED_DELIVERY2_EMAIL'), password: requireEnv('SEED_DELIVERY_PASSWORD'), name: 'Priya Devi', mobile: '9876500004', role: 'delivery' },
  ];
  for (const u of users) await upsertUser(u);
  console.log(`Users ready: ${users.map((u) => `${u.role}=${u.email}`).join(', ')}`);

  const categoryIds = {};
  for (const c of CATEGORIES) {
    const doc = await Category.findOneAndUpdate({ name: c.name }, { $set: { ...c, isActive: true } }, { upsert: true, new: true });
    categoryIds[c.name] = doc._id;
  }
  console.log(`Categories ready: ${CATEGORIES.length}`);

  for (const [category, name, description, price, stock] of PRODUCTS) {
    // $setOnInsert for stock: re-running the seed will NOT reset stock used by real demo orders.
    await Product.findOneAndUpdate(
      { name },
      { $set: { category: categoryIds[category], description, price, isActive: true }, $setOnInsert: { stock } },
      { upsert: true, new: true }
    );
  }
  console.log(`Products ready: ${PRODUCTS.length}`);
  console.log('\nSeed complete. Demo passwords are the SEED_* values in backend/.env');
}

seed()
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
