/**
 * MODULE 2 — Product and order management (API integration tests)
 */
const request = require('supertest');
const createApp = require('../../src/app');
const Product = require('../../src/models/Product');
const Order = require('../../src/models/Order');
const Notification = require('../../src/models/Notification');
const { connectTestDB, clearTestDB, closeTestDB } = require('../setup/db');
const { createUser, authHeader, createCategory, createProduct, shippingAddress } = require('../setup/factories');

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

let customer;
let otherCustomer;
let adminUser;
let pen; // price 100, stock 10
let bag; // price 999, stock 2

beforeEach(async () => {
  customer = await createUser();
  otherCustomer = await createUser();
  adminUser = await createUser({ role: 'admin' });
  const category = await createCategory();
  pen = await createProduct({ name: 'Pen', price: 100, stock: 10, category: category._id });
  bag = await createProduct({ name: 'Bag', price: 999, stock: 2, category: category._id });
});

const placeOrder = (user, items, extra = {}) =>
  request(app).post('/api/orders').set(authHeader(user)).send({ items, shippingAddress, ...extra });

describe('Products and categories', () => {
  test('TC-PROD-01 public catalogue lists only active products', async () => {
    await createProduct({ name: 'Hidden', isActive: false });
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    const names = res.body.data.items.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Pen', 'Bag']));
    expect(names).not.toContain('Hidden');
  });

  test('TC-PROD-02 search by name is case-insensitive', async () => {
    const res = await request(app).get('/api/products').query({ q: 'pEn' });
    expect(res.body.data.items.map((p) => p.name)).toEqual(['Pen']);
  });

  test('TC-PROD-03 admin creates a product', async () => {
    const category = await createCategory();
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(adminUser))
      .send({ name: 'Notebook', category: String(category._id), price: 49.5, stock: 0 });
    expect(res.status).toBe(201);
    expect(res.body.data.product).toMatchObject({ name: 'Notebook', price: 49.5, stock: 0 });
  });

  test('TC-PROD-04 price 0 and negative stock are rejected (boundary)', async () => {
    const category = await createCategory();
    const base = { name: 'Bad', category: String(category._id), price: 10, stock: 1 };
    const zeroPrice = await request(app).post('/api/products').set(authHeader(adminUser)).send({ ...base, price: 0 });
    const negStock = await request(app).post('/api/products').set(authHeader(adminUser)).send({ ...base, stock: -1 });
    expect(zeroPrice.status).toBe(400);
    expect(negStock.status).toBe(400);
  });

  test('TC-PROD-05 deactivated product disappears from the catalogue and returns 404 to the public', async () => {
    const res = await request(app).patch(`/api/products/${pen._id}`).set(authHeader(adminUser)).send({ isActive: false });
    expect(res.status).toBe(200);
    const view = await request(app).get(`/api/products/${pen._id}`);
    expect(view.status).toBe(404);
  });

  test('TC-PROD-06 duplicate category name returns 409', async () => {
    await request(app).post('/api/categories').set(authHeader(adminUser)).send({ name: 'Toys' });
    const res = await request(app).post('/api/categories').set(authHeader(adminUser)).send({ name: 'Toys' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/orders (place order)', () => {
  test('TC-ORD-01 successful order: ID generated, totals from DB, stock reduced, notification created', async () => {
    const res = await placeOrder(customer, [{ productId: String(pen._id), quantity: 2, price: 1 }], { total: 1 });
    expect(res.status).toBe(201);
    const { order } = res.body.data;
    expect(order.orderId).toMatch(/^ODTS-\d{8}-\d{4}$/);
    expect(order.status).toBe('Pending');
    expect(order.subtotal).toBe(200); // 2 x 100 from the database (the "price: 1" was ignored)
    expect(order.deliveryFee).toBe(40);
    expect(order.total).toBe(240);
    expect(order.statusHistory).toHaveLength(1);

    expect((await Product.findById(pen._id)).stock).toBe(8);
    expect(await Notification.countDocuments({ user: customer._id, orderId: order.orderId })).toBe(1);
  });

  test('TC-ORD-02 free delivery at exactly the threshold (boundary)', async () => {
    const res = await placeOrder(customer, [{ productId: String(bag._id), quantity: 1 }]);
    expect(res.status).toBe(201);
    expect(res.body.data.order).toMatchObject({ subtotal: 999, deliveryFee: 0, total: 999 });
  });

  test('TC-ORD-03 empty order is rejected', async () => {
    const res = await placeOrder(customer, []);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least one item/i);
  });

  test('TC-ORD-04 malformed product id -> 400; well-formed but unknown id -> 400', async () => {
    const bad = await placeOrder(customer, [{ productId: 'not-an-id', quantity: 1 }]);
    const unknown = await placeOrder(customer, [{ productId: 'f'.repeat(24), quantity: 1 }]);
    expect(bad.status).toBe(400);
    expect(unknown.status).toBe(400);
  });

  test('TC-ORD-05 quantity 0 is rejected (boundary)', async () => {
    const res = await placeOrder(customer, [{ productId: String(pen._id), quantity: 0 }]);
    expect(res.status).toBe(400);
  });

  test('TC-ORD-06 ordering exactly all remaining stock succeeds; one more fails (boundary)', async () => {
    const all = await placeOrder(customer, [{ productId: String(bag._id), quantity: 2 }]);
    expect(all.status).toBe(201);
    const more = await placeOrder(customer, [{ productId: String(bag._id), quantity: 1 }]);
    expect(more.status).toBe(409);
    expect((await Product.findById(bag._id)).stock).toBe(0);
  });

  test('TC-ORD-07 insufficient stock -> 409 and NO stock is taken from other items', async () => {
    const res = await placeOrder(customer, [
      { productId: String(pen._id), quantity: 3 },
      { productId: String(bag._id), quantity: 5 },
    ]);
    expect(res.status).toBe(409);
    expect((await Product.findById(pen._id)).stock).toBe(10);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('TC-ORD-08 inactive product cannot be ordered', async () => {
    await Product.updateOne({ _id: pen._id }, { isActive: false });
    const res = await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    expect(res.status).toBe(400);
  });

  test('TC-ORD-09 same idempotency key twice creates only ONE order (double-click protection)', async () => {
    const items = [{ productId: String(pen._id), quantity: 1 }];
    const first = await placeOrder(customer, items, { idempotencyKey: 'checkout-abc-123' });
    const second = await placeOrder(customer, items, { idempotencyKey: 'checkout-abc-123' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.order.orderId).toBe(first.body.data.order.orderId);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(pen._id)).stock).toBe(9);
  });

  test('TC-ORD-10 admins cannot place customer orders', async () => {
    const res = await placeOrder(adminUser, [{ productId: String(pen._id), quantity: 1 }]);
    expect(res.status).toBe(403);
  });
});

describe('Viewing orders (ODTS-12)', () => {
  test('TC-ORD-11 "my orders" only returns the logged-in customer\'s orders', async () => {
    await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    await placeOrder(otherCustomer, [{ productId: String(pen._id), quantity: 1 }]);
    const res = await request(app).get('/api/orders/mine').set(authHeader(customer));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });

  test('TC-ORD-12 filter my orders by status and search by order ID', async () => {
    const a = await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    const id = a.body.data.order.orderId;
    await request(app).post(`/api/orders/${id}/cancel`).set(authHeader(customer)).send({});

    const cancelled = await request(app).get('/api/orders/mine').query({ status: 'Cancelled' }).set(authHeader(customer));
    expect(cancelled.body.data.items.map((o) => o.orderId)).toEqual([id]);
    const search = await request(app).get('/api/orders/mine').query({ q: id.slice(-4) }).set(authHeader(customer));
    expect(search.body.data.items.map((o) => o.orderId)).toContain(id);
  });

  test('TC-ORD-13 nonexistent order -> 404; malformed order ID -> 400', async () => {
    const missing = await request(app).get('/api/orders/ODTS-20990101-0001').set(authHeader(customer));
    const malformed = await request(app).get('/api/orders/12345').set(authHeader(customer));
    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(400);
  });

  test("TC-ORD-14 a customer cannot view another customer's order (404)", async () => {
    const placed = await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    const res = await request(app).get(`/api/orders/${placed.body.data.order.orderId}`).set(authHeader(otherCustomer));
    expect(res.status).toBe(404);
  });

  test('TC-ORD-15 admin sees all orders and can filter by status', async () => {
    await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    await placeOrder(otherCustomer, [{ productId: String(pen._id), quantity: 1 }]);
    const res = await request(app).get('/api/orders').query({ status: 'Pending' }).set(authHeader(adminUser));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
  });
});

describe('Cancelling orders', () => {
  test('TC-ORD-16 customer cancels a pending order: stock restored, history + notification added', async () => {
    const placed = await placeOrder(customer, [{ productId: String(pen._id), quantity: 4 }]);
    const id = placed.body.data.order.orderId;
    const res = await request(app).post(`/api/orders/${id}/cancel`).set(authHeader(customer)).send({ reason: 'Changed my mind' });
    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('Cancelled');
    expect(res.body.data.order.statusHistory).toHaveLength(2);
    expect((await Product.findById(pen._id)).stock).toBe(10);
    expect(await Notification.countDocuments({ user: customer._id, type: 'ORDER_CANCELLED' })).toBe(1);
  });

  test('TC-ORD-17 cancelling twice -> 409', async () => {
    const placed = await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    const id = placed.body.data.order.orderId;
    await request(app).post(`/api/orders/${id}/cancel`).set(authHeader(customer)).send({});
    const again = await request(app).post(`/api/orders/${id}/cancel`).set(authHeader(customer)).send({});
    expect(again.status).toBe(409);
  });

  test('TC-ORD-18 customer cannot cancel once the order is Processing (403)', async () => {
    const placed = await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    const id = placed.body.data.order.orderId;
    for (const status of ['Confirmed', 'Processing']) {
      await request(app).patch(`/api/orders/${id}/status`).set(authHeader(adminUser)).send({ status });
    }
    const res = await request(app).post(`/api/orders/${id}/cancel`).set(authHeader(customer)).send({});
    expect(res.status).toBe(403);
  });

  test("TC-ORD-19 a customer cannot cancel someone else's order (404)", async () => {
    const placed = await placeOrder(customer, [{ productId: String(pen._id), quantity: 1 }]);
    const res = await request(app)
      .post(`/api/orders/${placed.body.data.order.orderId}/cancel`)
      .set(authHeader(otherCustomer))
      .send({});
    expect(res.status).toBe(404);
  });
});
