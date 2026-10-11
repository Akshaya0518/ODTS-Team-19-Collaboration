/**
 * MODULE 3 — Delivery assignment, status updates and tracking (API integration tests)
 */
const request = require('supertest');
const createApp = require('../../src/app');
const Order = require('../../src/models/Order');
const Delivery = require('../../src/models/Delivery');
const Notification = require('../../src/models/Notification');
const { connectTestDB, clearTestDB, closeTestDB } = require('../setup/db');
const { createUser, authHeader, createProduct, shippingAddress } = require('../setup/factories');

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

let customer;
let otherCustomer;
let adminUser;
let ravi; // assigned delivery person
let priya; // another delivery person
let orderId;

beforeEach(async () => {
  customer = await createUser();
  otherCustomer = await createUser();
  adminUser = await createUser({ role: 'admin' });
  ravi = await createUser({ role: 'delivery', name: 'Ravi' });
  priya = await createUser({ role: 'delivery', name: 'Priya' });
  const product = await createProduct({ price: 250, stock: 20 });
  const res = await request(app)
    .post('/api/orders')
    .set(authHeader(customer))
    .send({ items: [{ productId: String(product._id), quantity: 2 }], shippingAddress });
  orderId = res.body.data.order.orderId;
});

const adminStatus = (status, note) =>
  request(app).patch(`/api/orders/${orderId}/status`).set(authHeader(adminUser)).send({ status, note });

const assign = (personId, extra = {}) =>
  request(app)
    .post('/api/deliveries/assign')
    .set(authHeader(adminUser))
    .send({ orderId, deliveryPersonId: String(personId), ...extra });

const deliveryStatus = (user, deliveryId, status, note) =>
  request(app).patch(`/api/deliveries/${deliveryId}/status`).set(authHeader(user)).send({ status, note });

/** Confirm -> assign Ravi -> Processing -> Shipped. Returns the delivery id. */
async function prepareShippedOrder() {
  await adminStatus('Confirmed');
  const assigned = await assign(ravi._id);
  await adminStatus('Processing');
  await adminStatus('Shipped');
  return assigned.body.data.delivery._id;
}

describe('Assigning delivery personnel (ODTS-13)', () => {
  test('TC-DEL-01 cannot assign before the order is confirmed (409)', async () => {
    const res = await assign(ravi._id);
    expect(res.status).toBe(409);
  });

  test('TC-DEL-02 assigning to a non-delivery user is rejected (400)', async () => {
    await adminStatus('Confirmed');
    const res = await assign(customer._id);
    expect(res.status).toBe(400);
  });

  test('TC-DEL-03 valid assignment creates a delivery and notifies the delivery person', async () => {
    await adminStatus('Confirmed');
    const res = await assign(ravi._id, { estimatedDeliveryDate: '2099-12-31' });
    expect(res.status).toBe(201);
    expect(res.body.data.delivery.assignedTo.name).toBe('Ravi');
    expect(await Notification.countDocuments({ user: ravi._id, type: 'DELIVERY_ASSIGNED' })).toBe(1);
  });

  test('TC-DEL-04 estimated delivery date in the past is rejected (boundary)', async () => {
    await adminStatus('Confirmed');
    const res = await assign(ravi._id, { estimatedDeliveryDate: '2000-01-01' });
    expect(res.status).toBe(400);
  });

  test('TC-DEL-05 reassignment moves access from the old to the new delivery person', async () => {
    await adminStatus('Confirmed');
    const first = await assign(ravi._id);
    const second = await assign(priya._id);
    expect(second.status).toBe(200);
    expect(second.body.data.reassigned).toBe(true);
    const id = first.body.data.delivery._id;
    expect((await request(app).get(`/api/deliveries/${id}`).set(authHeader(ravi))).status).toBe(403);
    expect((await request(app).get(`/api/deliveries/${id}`).set(authHeader(priya))).status).toBe(200);
  });

  test('TC-DEL-06 an order cannot be shipped before someone is assigned (409)', async () => {
    await adminStatus('Confirmed');
    await adminStatus('Processing');
    const res = await adminStatus('Shipped');
    expect(res.status).toBe(409);
  });

  test('TC-DEL-07 only admins can assign (customer gets 403)', async () => {
    await adminStatus('Confirmed');
    const res = await request(app)
      .post('/api/deliveries/assign')
      .set(authHeader(customer))
      .send({ orderId, deliveryPersonId: String(ravi._id) });
    expect(res.status).toBe(403);
  });
});

describe('Updating delivery status (ODTS-14)', () => {
  test('TC-DEL-08 full journey: status history records who/when and the customer is notified at every step', async () => {
    const deliveryId = await prepareShippedOrder();
    const out = await deliveryStatus(ravi, deliveryId, 'Out for Delivery', 'Left the hub');
    expect(out.status).toBe(200);
    const done = await deliveryStatus(ravi, deliveryId, 'Delivered', 'Handed to customer');
    expect(done.status).toBe(200);

    const order = await Order.findOne({ orderId });
    expect(order.status).toBe('Delivered');
    expect(order.statusHistory.map((h) => h.status)).toEqual([
      'Pending',
      'Confirmed',
      'Processing',
      'Shipped',
      'Out for Delivery',
      'Delivered',
    ]);
    const last = order.statusHistory[order.statusHistory.length - 1];
    expect(String(last.changedBy)).toBe(String(ravi._id));
    expect(last.role).toBe('delivery');
    expect(last.note).toBe('Handed to customer');
    expect(last.at).toBeInstanceOf(Date);

    const notes = await Notification.find({ user: customer._id }).sort({ _id: 1 });
    expect(notes.map((n) => n.type)).toEqual([
      'ORDER_PENDING',
      'ORDER_CONFIRMED',
      'ORDER_PROCESSING',
      'ORDER_SHIPPED',
      'ORDER_OUT_FOR_DELIVERY',
      'ORDER_DELIVERED',
    ]);
    expect((await Delivery.findById(deliveryId)).deliveredAt).toBeInstanceOf(Date);
  });

  test('TC-DEL-09 invalid status value -> 400', async () => {
    const deliveryId = await prepareShippedOrder();
    const res = await deliveryStatus(ravi, deliveryId, 'Flying');
    expect(res.status).toBe(400);
  });

  test('TC-DEL-10 skipping a step (Shipped -> Delivered) -> 409', async () => {
    const deliveryId = await prepareShippedOrder();
    const res = await deliveryStatus(ravi, deliveryId, 'Delivered');
    expect(res.status).toBe(409);
  });

  test('TC-DEL-11 delivery person cannot do admin-only moves (Processing -> Shipped) -> 403', async () => {
    await adminStatus('Confirmed');
    const assigned = await assign(ravi._id);
    await adminStatus('Processing');
    const res = await deliveryStatus(ravi, assigned.body.data.delivery._id, 'Shipped');
    expect(res.status).toBe(403);
  });

  test('TC-DEL-12 a delivery person NOT assigned cannot view or update the delivery (403)', async () => {
    const deliveryId = await prepareShippedOrder();
    const view = await request(app).get(`/api/deliveries/${deliveryId}`).set(authHeader(priya));
    const update = await deliveryStatus(priya, deliveryId, 'Out for Delivery');
    const viewOrder = await request(app).get(`/api/orders/${orderId}`).set(authHeader(priya));
    expect(view.status).toBe(403);
    expect(update.status).toBe(403);
    expect(viewOrder.status).toBe(403);
    expect((await Order.findOne({ orderId })).status).toBe('Shipped'); // unchanged
  });

  test('TC-DEL-13 customers cannot update delivery status (403)', async () => {
    const deliveryId = await prepareShippedOrder();
    const res = await deliveryStatus(customer, deliveryId, 'Out for Delivery');
    expect(res.status).toBe(403);
  });

  test('TC-DEL-14 nonexistent delivery -> 404', async () => {
    const res = await deliveryStatus(ravi, 'a'.repeat(24), 'Out for Delivery');
    expect(res.status).toBe(404);
  });

  test('TC-DEL-15 delivery notes: valid note saved, empty note rejected', async () => {
    const deliveryId = await prepareShippedOrder();
    const ok = await request(app).post(`/api/deliveries/${deliveryId}/notes`).set(authHeader(ravi)).send({ text: 'Gate locked, called customer' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.delivery.notes[0].text).toBe('Gate locked, called customer');
    const empty = await request(app).post(`/api/deliveries/${deliveryId}/notes`).set(authHeader(ravi)).send({ text: '   ' });
    expect(empty.status).toBe(400);
  });

  test('TC-DEL-16 delivery list: active vs completed scope', async () => {
    const deliveryId = await prepareShippedOrder();
    const active = await request(app).get('/api/deliveries').query({ scope: 'active' }).set(authHeader(ravi));
    expect(active.body.data.total).toBe(1);
    await deliveryStatus(ravi, deliveryId, 'Out for Delivery');
    await deliveryStatus(ravi, deliveryId, 'Delivered');
    const activeAfter = await request(app).get('/api/deliveries').query({ scope: 'active' }).set(authHeader(ravi));
    const completed = await request(app).get('/api/deliveries').query({ scope: 'completed' }).set(authHeader(ravi));
    expect(activeAfter.body.data.total).toBe(0);
    expect(completed.body.data.total).toBe(1);
    const priyaList = await request(app).get('/api/deliveries').query({ scope: 'all' }).set(authHeader(priya));
    expect(priyaList.body.data.total).toBe(0);
  });
});

describe('Customer tracking (ODTS-15) and notifications (ODTS-16)', () => {
  test('TC-TRK-01 tracking shows the CURRENT status from the database with a timeline', async () => {
    await prepareShippedOrder();
    const res = await request(app).get(`/api/orders/${orderId}/tracking`).set(authHeader(customer));
    expect(res.status).toBe(200);
    const { tracking } = res.body.data;
    expect(tracking.status).toBe('Shipped');
    expect(tracking.trackingType).toBe('STATUS_BASED');
    expect(tracking.steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'current', 'upcoming', 'upcoming']);
    expect(tracking.delivery.assignedTo.name).toBe('Ravi');
    expect(tracking.history[0].status).toBe('Shipped'); // newest first
  });

  test('TC-TRK-02 tracking a nonexistent order -> 404', async () => {
    const res = await request(app).get('/api/orders/ODTS-20990101-0001/tracking').set(authHeader(customer));
    expect(res.status).toBe(404);
  });

  test("TC-TRK-03 tracking another customer's order -> 404", async () => {
    const res = await request(app).get(`/api/orders/${orderId}/tracking`).set(authHeader(otherCustomer));
    expect(res.status).toBe(404);
  });

  test('TC-NOT-01 customer lists notifications and marks one as read', async () => {
    await adminStatus('Confirmed');
    const list = await request(app).get('/api/notifications').set(authHeader(customer));
    expect(list.status).toBe(200);
    expect(list.body.data.unreadCount).toBe(2);
    const id = list.body.data.items[0]._id;
    const read = await request(app).patch(`/api/notifications/${id}/read`).set(authHeader(customer));
    expect(read.status).toBe(200);
    expect(read.body.data.notification.isRead).toBe(true);
  });

  test("TC-NOT-02 a user cannot mark someone else's notification (404)", async () => {
    const list = await request(app).get('/api/notifications').set(authHeader(customer));
    const id = list.body.data.items[0]._id;
    const res = await request(app).patch(`/api/notifications/${id}/read`).set(authHeader(otherCustomer));
    expect(res.status).toBe(404);
  });
});

describe('Dashboard and reports (ODTS-17, ODTS-18)', () => {
  test('TC-DASH-01 admin dashboard numbers are calculated from the database', async () => {
    const deliveryId = await prepareShippedOrder();
    await deliveryStatus(ravi, deliveryId, 'Out for Delivery');
    const res = await request(app).get('/api/dashboard').set(authHeader(adminUser));
    expect(res.status).toBe(200);
    expect(res.body.data.stats).toMatchObject({
      totalOrders: 1,
      pendingOrders: 0,
      inTransitOrders: 1,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalCustomers: 2,
    });
  });

  test('TC-REP-01 order report totals match the orders, and CSV export works', async () => {
    const res = await request(app).get('/api/reports/orders').set(authHeader(adminUser));
    expect(res.status).toBe(200);
    const order = await Order.findOne({ orderId });
    expect(res.body.data.summary.totalOrders).toBe(1);
    expect(res.body.data.summary.totalOrderValue).toBe(order.total);

    const csv = await request(app).get('/api/reports/orders').query({ format: 'csv' }).set(authHeader(adminUser));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain(orderId);
  });

  test('TC-REP-02 "from" after "to" is rejected (400)', async () => {
    const res = await request(app)
      .get('/api/reports/orders')
      .query({ from: '2026-12-31', to: '2026-01-01' })
      .set(authHeader(adminUser));
    expect(res.status).toBe(400);
  });
});
