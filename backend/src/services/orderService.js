/**
 * ORDER SERVICE — the heart of the system.
 *
 *  createOrder        customer checkout (prices + stock checked on the server)
 *  applyStatusChange  the ONLY function that changes an order's status
 *  getTracking        data for the customer's tracking timeline
 */
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notificationService');
const { config } = require('../config/env');
const { generateOrderId } = require('../utils/orderId');
const { dateRangeFilter } = require('../utils/dates');
const { getPagination, paginated, escapeRegex, roundMoney } = require('../utils/http');
const { MAX_QTY_PER_ITEM } = require('../validators/orderValidators');
const {
  ORDER_STATUS,
  TRACKING_STEPS,
  assertTransitionAllowed,
  nextStatusesFor,
  trackingLabel,
} = require('../utils/orderStatus');

/* ------------------------------------------------------------------ */
/* Stock helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Reserves stock with ATOMIC conditional updates:
 * "reduce stock by N only if stock >= N and the product is active".
 * If any line fails, everything reserved so far is put back.
 */
async function reserveStock(lines) {
  const reserved = [];
  for (const line of lines) {
    const result = await Product.updateOne(
      { _id: line.product, isActive: true, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } }
    );
    if (result.modifiedCount !== 1) {
      await releaseStock(reserved);
      throw ApiError.conflict(`Not enough stock for "${line.name}". Please reduce the quantity.`);
    }
    reserved.push(line);
  }
  return reserved;
}

async function releaseStock(lines) {
  await Promise.all(
    lines.map((line) => Product.updateOne({ _id: line.product }, { $inc: { stock: line.quantity } }))
  );
}

/** Combines duplicate products in the cart into one line. */
function mergeCartLines(items) {
  const quantities = new Map();
  for (const { productId, quantity } of items) {
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }
  return [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

async function buildOrderItems(lines) {
  const products = await Product.find({ _id: { $in: lines.map((l) => l.productId) } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return lines.map(({ productId, quantity }) => {
    const product = byId.get(productId);
    if (!product || !product.isActive) {
      throw ApiError.badRequest(`Product ${productId} does not exist or is no longer available`);
    }
    if (quantity > MAX_QTY_PER_ITEM) {
      throw ApiError.badRequest(`You can order at most ${MAX_QTY_PER_ITEM} of "${product.name}"`);
    }
    if (product.stock < quantity) {
      throw ApiError.conflict(`Only ${product.stock} left in stock for "${product.name}"`);
    }
    return {
      product: product._id,
      name: product.name,
      unitPrice: product.price, // price comes from the DATABASE, never from the browser
      quantity,
      lineTotal: roundMoney(product.price * quantity),
    };
  });
}

function calculateTotals(items) {
  const subtotal = roundMoney(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const deliveryFee = subtotal >= config.freeDeliveryThreshold ? 0 : config.deliveryFee;
  return { subtotal, deliveryFee, total: roundMoney(subtotal + deliveryFee) };
}

/**
 * @returns {{ order: object, created: boolean }} created=false when the same checkout
 *          (same idempotencyKey) was already submitted — e.g. a double-click.
 */
async function createOrder(customer, { items, shippingAddress, idempotencyKey: clientKey }) {
  if (clientKey) {
    const existing = await Order.findOne({ customer: customer._id, idempotencyKey: clientKey });
    if (existing) return { order: existing, created: false };
  }
  const idempotencyKey = clientKey || crypto.randomUUID();

  const orderItems = await buildOrderItems(mergeCartLines(items));
  const totals = calculateTotals(orderItems);
  const reserved = await reserveStock(orderItems);

  let order;
  try {
    order = await Order.create({
      orderId: await generateOrderId(),
      customer: customer._id,
      items: orderItems,
      ...totals,
      shippingAddress,
      status: ORDER_STATUS.PENDING,
      statusHistory: [
        { status: ORDER_STATUS.PENDING, changedBy: customer._id, role: 'customer', note: 'Order placed' },
      ],
      idempotencyKey,
    });
  } catch (err) {
    await releaseStock(reserved); // the order was not saved, so give the stock back
    if (err.code === 11000 && clientKey) {
      const existing = await Order.findOne({ customer: customer._id, idempotencyKey });
      if (existing) return { order: existing, created: false };
    }
    throw err;
  }

  await notificationService.notifyCustomerOfStatus(order);
  return { order, created: true };
}

/* ------------------------------------------------------------------ */
/* Read + access control                                               */
/* ------------------------------------------------------------------ */

async function findByOrderId(orderId) {
  const order = await Order.findOne({ orderId });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

/**
 * Who may see an order?
 *  - admin: every order
 *  - customer: only their own (others get 404, so order IDs cannot be "probed")
 *  - delivery: only orders assigned to them (others get 403)
 * Returns the delivery record (or null) because callers usually need it next.
 */
async function assertCanAccess(user, order) {
  const delivery = await Delivery.findOne({ order: order._id });
  if (user.role === 'admin') return delivery;
  if (user.role === 'customer') {
    if (String(order.customer) !== String(user._id)) throw ApiError.notFound('Order not found');
    return delivery;
  }
  if (user.role === 'delivery') {
    if (!isAssigneeOf(delivery, user)) throw ApiError.forbidden('This delivery is not assigned to you');
    return delivery;
  }
  throw ApiError.forbidden();
}

function deliverySummary(delivery) {
  if (!delivery) return null;
  return {
    _id: delivery._id,
    assignedTo: delivery.assignedTo
      ? { _id: delivery.assignedTo._id, name: delivery.assignedTo.name, mobile: delivery.assignedTo.mobile }
      : null,
    estimatedDeliveryDate: delivery.estimatedDeliveryDate || null,
    deliveredAt: delivery.deliveredAt || null,
    notes: delivery.notes || [],
    assignedAt: delivery.updatedAt,
  };
}

async function getOrderDetails(user, orderId) {
  const order = await findByOrderId(orderId);
  await assertCanAccess(user, order);
  await order.populate([
    { path: 'customer', select: 'name email mobile' },
    { path: 'statusHistory.changedBy', select: 'name role' },
  ]);
  const delivery = await Delivery.findOne({ order: order._id })
    .populate('assignedTo', 'name mobile')
    .populate('notes.by', 'name role');
  return {
    ...order.toObject(),
    statusLabel: trackingLabel(order.status),
    delivery: deliverySummary(delivery),
    allowedNextStatuses: nextStatusesFor(order.status, user.role),
  };
}

async function listCustomerOrders(user, query) {
  const filter = { customer: user._id };
  if (query.status) filter.status = query.status;
  if (query.q) filter.orderId = new RegExp(escapeRegex(query.q), 'i');
  const pg = getPagination(query);
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).select('-statusHistory -idempotencyKey'),
    Order.countDocuments(filter),
  ]);
  return paginated(items, total, pg);
}

async function attachAssignees(orders) {
  const deliveries = await Delivery.find({ order: { $in: orders.map((o) => o._id) } }).populate(
    'assignedTo',
    'name'
  );
  const byOrder = new Map(deliveries.map((d) => [String(d.order), d]));
  return orders.map((o) => {
    const d = byOrder.get(String(o._id));
    return {
      ...o.toObject(),
      assignedTo: d?.assignedTo ? { _id: d.assignedTo._id, name: d.assignedTo.name } : null,
      deliveryId: d?._id || null,
    };
  });
}

async function listAllOrders(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) filter.orderId = new RegExp(escapeRegex(query.q), 'i');
  const created = dateRangeFilter(query.from, query.to);
  if (created) filter.createdAt = created;
  const pg = getPagination(query);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .select('-statusHistory -idempotencyKey')
      .populate('customer', 'name email'),
    Order.countDocuments(filter),
  ]);
  return paginated(await attachAssignees(orders), total, pg);
}

/* ------------------------------------------------------------------ */
/* Status changes                                                      */
/* ------------------------------------------------------------------ */

/**
 * The ONLY place where an order's status changes. It:
 *  1. checks the transition rules and the user's role/assignment
 *  2. saves the new status + a status-history entry (who, when, note)
 *     using "update only if the status is still what we read" (stops two people
 *     changing the same order at the same moment)
 *  3. gives stock back on cancellation / records delivery time on delivery
 *  4. creates an in-app notification for the customer
 */
/** True when `user` is the delivery person assigned to `delivery`. */
function isAssigneeOf(delivery, user) {
  if (!delivery) return false;
  const assigned = delivery.assignedTo?._id || delivery.assignedTo;
  return String(assigned) === String(user._id);
}

/** Side effects that follow a successful status change. */
async function afterStatusChange(updated, deliveryRecord, changedAt) {
  if (updated.status === ORDER_STATUS.CANCELLED) await releaseStock(updated.items);
  if (updated.status === ORDER_STATUS.DELIVERED && deliveryRecord) {
    await Delivery.updateOne({ _id: deliveryRecord._id }, { deliveredAt: changedAt });
  }
  await notificationService.notifyCustomerOfStatus(updated);
}

async function applyStatusChange({ actor, order, to, note, delivery }) {
  const deliveryRecord = delivery === undefined ? await Delivery.findOne({ order: order._id }) : delivery;

  assertTransitionAllowed({
    from: order.status,
    to,
    role: actor.role,
    hasAssignment: Boolean(deliveryRecord),
    isAssignee: isAssigneeOf(deliveryRecord, actor),
  });

  const now = new Date();
  const text = note || '';
  const update = {
    $set: { status: to },
    $push: { statusHistory: { status: to, changedBy: actor._id, role: actor.role, note: text, at: now } },
  };
  if (to === ORDER_STATUS.CANCELLED) update.$set.cancelReason = text || 'Cancelled';

  // "status: order.status" makes this update fail if someone else changed the order meanwhile.
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, update, {
    new: true,
  });
  if (!updated) {
    throw ApiError.conflict('This order was just updated by someone else. Refresh and try again.');
  }

  await afterStatusChange(updated, deliveryRecord, now);
  return updated;
}

async function adminUpdateStatus(admin, orderId, { status, note }) {
  const order = await findByOrderId(orderId);
  return applyStatusChange({ actor: admin, order, to: status, note });
}

/** Customers can cancel their own order while it is Pending or Confirmed; admins until it ships. */
async function cancelOrder(user, orderId, { reason }) {
  const order = await findByOrderId(orderId);
  const delivery = await assertCanAccess(user, order);
  return applyStatusChange({ actor: user, order, to: ORDER_STATUS.CANCELLED, note: reason, delivery });
}

/* ------------------------------------------------------------------ */
/* Tracking                                                            */
/* ------------------------------------------------------------------ */

function lastProgressStatus(history) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].status !== ORDER_STATUS.CANCELLED) return history[i].status;
  }
  return ORDER_STATUS.PENDING;
}

function stepState(index, currentIndex, order) {
  if (index < currentIndex) return 'done';
  if (index === currentIndex) {
    if (order.status === ORDER_STATUS.DELIVERED) return 'done';
    if (order.status === ORDER_STATUS.CANCELLED) return 'done';
    return 'current';
  }
  return order.status === ORDER_STATUS.CANCELLED ? 'cancelled' : 'upcoming';
}

/** Builds the 6-step timeline from the REAL status history stored in MongoDB. */
function buildTimeline(order) {
  const reachedAt = {};
  for (const entry of order.statusHistory) {
    if (!reachedAt[entry.status]) reachedAt[entry.status] = entry.at;
  }
  const progress = order.status === ORDER_STATUS.CANCELLED ? lastProgressStatus(order.statusHistory) : order.status;
  const currentIndex = TRACKING_STEPS.findIndex((s) => s.status === progress);
  return TRACKING_STEPS.map((step, index) => ({
    status: step.status,
    label: step.label,
    at: reachedAt[step.status] || null,
    state: stepState(index, currentIndex, order),
  }));
}

async function getTracking(user, orderId) {
  const order = await findByOrderId(orderId);
  await assertCanAccess(user, order);
  await order.populate('statusHistory.changedBy', 'name role');
  const delivery = await Delivery.findOne({ order: order._id }).populate('assignedTo', 'name mobile');

  return {
    orderId: order.orderId,
    status: order.status,
    statusLabel: trackingLabel(order.status),
    isCancelled: order.status === ORDER_STATUS.CANCELLED,
    cancelReason: order.cancelReason || null,
    placedAt: order.createdAt,
    total: order.total,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    shippingAddress: order.shippingAddress,
    steps: buildTimeline(order),
    history: order.statusHistory
      .map((h) => ({
        status: h.status,
        label: h.status === ORDER_STATUS.CANCELLED ? 'Cancelled' : trackingLabel(h.status),
        at: h.at,
        note: h.note,
        by: h.changedBy ? { name: h.changedBy.name, role: h.changedBy.role } : null,
      }))
      .reverse(),
    delivery: deliverySummary(delivery),
    trackingType: 'STATUS_BASED',
    trackingNote: 'Status-based delivery tracking. Live GPS location is not part of this prototype.',
    lastUpdatedAt: order.updatedAt,
  };
}

module.exports = {
  createOrder,
  listCustomerOrders,
  listAllOrders,
  getOrderDetails,
  adminUpdateStatus,
  cancelOrder,
  applyStatusChange,
  getTracking,
  findByOrderId,
  assertCanAccess,
  isAssigneeOf,
  buildTimeline,
  calculateTotals,
  mergeCartLines,
  deliverySummary,
};
