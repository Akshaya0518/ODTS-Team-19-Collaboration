/**
 * DELIVERY SERVICE
 *  assign        admin assigns / reassigns a delivery person
 *  listForUser   a delivery person's own deliveries (or all, for admins)
 *  getDetails    one delivery (only the assignee or an admin)
 *  updateStatus  assignee/admin moves the order forward (uses orderService.applyStatusChange)
 *  addNote       assignee/admin adds a note
 */
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const orderService = require('./orderService');
const notificationService = require('./notificationService');
const { endOfLocalDay } = require('../utils/dates');
const { getPagination, paginated } = require('../utils/http');
const {
  ASSIGNABLE_STATUSES,
  FINAL_STATUSES,
  nextStatusesFor,
  trackingLabel,
} = require('../utils/orderStatus');

const ORDER_FIELDS = 'orderId status total items shippingAddress createdAt updatedAt customer statusHistory';

/** Checks everything needed before an assignment and returns the order, person and ETA. */
async function validateAssignment({ orderId, deliveryPersonId, estimatedDeliveryDate }) {
  const order = await orderService.findByOrderId(orderId);
  if (!ASSIGNABLE_STATUSES.includes(order.status)) {
    throw ApiError.conflict(
      `A delivery person can only be assigned after the order is confirmed (current status: ${order.status})`
    );
  }

  const person = await User.findOne({ _id: deliveryPersonId, role: 'delivery' });
  if (!person) throw ApiError.badRequest('Selected user is not a delivery person');
  if (!person.isActive) throw ApiError.badRequest('Selected delivery person is inactive');

  const eta = estimatedDeliveryDate ? endOfLocalDay(estimatedDeliveryDate) : undefined;
  if (eta && eta < new Date()) throw ApiError.badRequest('Estimated delivery date cannot be in the past');
  return { order, person, eta };
}

async function assign(admin, input) {
  const { order, person, eta } = await validateAssignment(input);

  let delivery = await Delivery.findOne({ order: order._id });
  const isNewAssignee = !delivery || String(delivery.assignedTo) !== String(person._id);

  if (!delivery) {
    delivery = new Delivery({ order: order._id, assignedTo: person._id, assignedBy: admin._id });
  } else {
    delivery.assignedTo = person._id;
    delivery.assignedBy = admin._id;
  }
  if (isNewAssignee) delivery.assignmentHistory.push({ assignedTo: person._id, assignedBy: admin._id });
  if (eta) delivery.estimatedDeliveryDate = eta;
  await delivery.save();

  if (isNewAssignee) await notificationService.notifyDeliveryAssignment(person._id, order);

  await delivery.populate('assignedTo', 'name mobile email');
  return { delivery, reassigned: isNewAssignee && delivery.assignmentHistory.length > 1 };
}

/** A delivery person can only ever be the assignee — enforced here for every route. */
function assertCanAccessDelivery(user, delivery) {
  if (user.role === 'admin') return;
  if (user.role === 'delivery' && orderService.isAssigneeOf(delivery, user)) return;
  throw ApiError.forbidden('This delivery is not assigned to you');
}

function shapeDelivery(delivery, viewerRole) {
  const d = delivery.toObject();
  const order = d.order;
  return {
    ...d,
    order: order && {
      ...order,
      statusLabel: trackingLabel(order.status),
      itemCount: order.items ? order.items.reduce((n, i) => n + i.quantity, 0) : 0,
    },
    allowedNextStatuses: order ? nextStatusesFor(order.status, viewerRole) : [],
  };
}

async function listForUser(user, query) {
  const filter = {};
  if (user.role === 'delivery') filter.assignedTo = user._id;
  else if (query.deliveryPersonId) filter.assignedTo = query.deliveryPersonId;

  // The status lives on the order, so first find which orders match the scope.
  if (query.scope !== 'all') {
    const statusFilter =
      query.scope === 'completed' ? { $in: FINAL_STATUSES } : { $nin: FINAL_STATUSES };
    const deliveries = await Delivery.find(filter).select('order').lean();
    const matching = await Order.find({
      _id: { $in: deliveries.map((d) => d.order) },
      status: statusFilter,
    })
      .select('_id')
      .lean();
    filter.order = { $in: matching.map((o) => o._id) };
  }

  const pg = getPagination(query);
  const [items, total] = await Promise.all([
    Delivery.find(filter)
      .sort({ updatedAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate({ path: 'order', select: ORDER_FIELDS, populate: { path: 'customer', select: 'name mobile' } })
      .populate('assignedTo', 'name mobile'),
    Delivery.countDocuments(filter),
  ]);
  return paginated(
    items.map((d) => shapeDelivery(d, user.role)),
    total,
    pg
  );
}

async function loadDelivery(id) {
  const delivery = await Delivery.findById(id)
    .populate({
      path: 'order',
      select: ORDER_FIELDS,
      populate: [
        { path: 'customer', select: 'name mobile' },
        { path: 'statusHistory.changedBy', select: 'name role' },
      ],
    })
    .populate('assignedTo', 'name mobile email')
    .populate('notes.by', 'name role');
  if (!delivery) throw ApiError.notFound('Delivery not found');
  return delivery;
}

async function getDetails(user, id) {
  const delivery = await loadDelivery(id);
  assertCanAccessDelivery(user, delivery);
  return shapeDelivery(delivery, user.role);
}

async function updateStatus(user, id, { status, note }) {
  const delivery = await Delivery.findById(id);
  if (!delivery) throw ApiError.notFound('Delivery not found');
  assertCanAccessDelivery(user, delivery);
  const order = await Order.findById(delivery.order);
  if (!order) throw ApiError.notFound('Order not found');
  await orderService.applyStatusChange({ actor: user, order, to: status, note, delivery });
  return getDetails(user, id);
}

async function addNote(user, id, { text }) {
  const delivery = await Delivery.findById(id);
  if (!delivery) throw ApiError.notFound('Delivery not found');
  assertCanAccessDelivery(user, delivery);
  delivery.notes.push({ text, by: user._id, role: user.role });
  await delivery.save();
  return getDetails(user, id);
}

module.exports = { assign, listForUser, getDetails, updateStatus, addNote };
