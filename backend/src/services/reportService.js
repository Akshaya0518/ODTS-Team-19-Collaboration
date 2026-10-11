/**
 * Reports are built from the same MongoDB data the rest of the app uses,
 * so the totals always match what you see in the order list.
 *
 * Definitions (shown in the UI too):
 *  - totalOrderValue  = sum of order totals EXCLUDING cancelled orders
 *  - pendingDeliveries = orders that are not Delivered and not Cancelled
 */
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const { dateRangeFilter } = require('../utils/dates');
const { roundMoney } = require('../utils/http');
const { ORDER_STATUS, ALL_STATUSES, FINAL_STATUSES } = require('../utils/orderStatus');

const REPORT_ROW_LIMIT = 5000;

function emptyStatusCounts() {
  return Object.fromEntries(ALL_STATUSES.map((s) => [s, 0]));
}

async function orderReport({ from, to, status }) {
  const filter = {};
  const created = dateRangeFilter(from, to);
  if (created) filter.createdAt = created;
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(REPORT_ROW_LIMIT)
    .populate('customer', 'name email')
    .lean();
  const deliveries = await Delivery.find({ order: { $in: orders.map((o) => o._id) } })
    .populate('assignedTo', 'name')
    .lean();
  const assignee = new Map(deliveries.map((d) => [String(d.order), d.assignedTo?.name || '']));

  const statusBreakdown = emptyStatusCounts();
  let totalOrderValue = 0;
  for (const o of orders) {
    statusBreakdown[o.status] += 1;
    if (o.status !== ORDER_STATUS.CANCELLED) totalOrderValue += o.total;
  }

  const rows = orders.map((o) => ({
    orderId: o.orderId,
    createdAt: o.createdAt,
    customerName: o.customer?.name || '',
    customerEmail: o.customer?.email || '',
    items: o.items.reduce((n, i) => n + i.quantity, 0),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    status: o.status,
    assignedTo: assignee.get(String(o._id)) || '',
  }));

  return {
    filters: { from: from || null, to: to || null, status: status || null },
    summary: {
      totalOrders: orders.length,
      totalOrderValue: roundMoney(totalOrderValue),
      deliveredOrders: statusBreakdown[ORDER_STATUS.DELIVERED],
      cancelledOrders: statusBreakdown[ORDER_STATUS.CANCELLED],
      pendingDeliveries: orders.filter((o) => !FINAL_STATUSES.includes(o.status)).length,
      statusBreakdown,
      truncated: orders.length === REPORT_ROW_LIMIT,
    },
    rows,
  };
}

async function deliveryReport({ from, to, status, deliveryPersonId }) {
  const filter = {};
  const assigned = dateRangeFilter(from, to);
  if (assigned) filter.createdAt = assigned; // date the delivery was first assigned
  if (deliveryPersonId) filter.assignedTo = deliveryPersonId;

  let deliveries = await Delivery.find(filter)
    .sort({ createdAt: -1 })
    .limit(REPORT_ROW_LIMIT)
    .populate('order', 'orderId status total createdAt')
    .populate('assignedTo', 'name')
    .lean();
  deliveries = deliveries.filter((d) => d.order && (!status || d.order.status === status));

  const statusBreakdown = emptyStatusCounts();
  for (const d of deliveries) statusBreakdown[d.order.status] += 1;

  return {
    filters: { from: from || null, to: to || null, status: status || null, deliveryPersonId: deliveryPersonId || null },
    summary: {
      totalDeliveries: deliveries.length,
      deliveredOrders: statusBreakdown[ORDER_STATUS.DELIVERED],
      pendingDeliveries: deliveries.filter((d) => !FINAL_STATUSES.includes(d.order.status)).length,
      cancelledDeliveries: statusBreakdown[ORDER_STATUS.CANCELLED],
      statusBreakdown,
      byDeliveryPerson: summariseByPerson(deliveries),
      truncated: deliveries.length === REPORT_ROW_LIMIT,
    },
    rows: deliveries.map(toDeliveryRow),
  };
}

/** "Yes"/"No" when we can tell whether it arrived by the estimated date, otherwise blank. */
function onTimeLabel(d) {
  if (!d.deliveredAt || !d.estimatedDeliveryDate) return '';
  return d.deliveredAt <= d.estimatedDeliveryDate ? 'Yes' : 'No';
}

function toDeliveryRow(d) {
  return {
    orderId: d.order.orderId,
    assignedTo: d.assignedTo?.name || '',
    assignedAt: d.createdAt,
    estimatedDeliveryDate: d.estimatedDeliveryDate || '',
    status: d.order.status,
    deliveredAt: d.deliveredAt || '',
    onTime: onTimeLabel(d),
    orderTotal: d.order.total,
  };
}

function summariseByPerson(deliveries) {
  const perPerson = new Map();
  for (const d of deliveries) {
    const name = d.assignedTo?.name || 'Unknown';
    const p = perPerson.get(name) || { name, assigned: 0, delivered: 0, pending: 0, onTime: 0 };
    p.assigned += 1;
    if (d.order.status === ORDER_STATUS.DELIVERED) p.delivered += 1;
    if (!FINAL_STATUSES.includes(d.order.status)) p.pending += 1;
    if (onTimeLabel(d) === 'Yes') p.onTime += 1;
    perPerson.set(name, p);
  }
  return [...perPerson.values()];
}

const ORDER_CSV_COLUMNS = [
  { key: 'orderId', label: 'Order ID' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'customerName', label: 'Customer' },
  { key: 'customerEmail', label: 'Email' },
  { key: 'items', label: 'Items' },
  { key: 'subtotal', label: 'Subtotal (INR)' },
  { key: 'deliveryFee', label: 'Delivery Fee (INR)' },
  { key: 'total', label: 'Total (INR)' },
  { key: 'status', label: 'Status' },
  { key: 'assignedTo', label: 'Delivery Person' },
];

const DELIVERY_CSV_COLUMNS = [
  { key: 'orderId', label: 'Order ID' },
  { key: 'assignedTo', label: 'Delivery Person' },
  { key: 'assignedAt', label: 'Assigned At' },
  { key: 'estimatedDeliveryDate', label: 'Estimated Delivery' },
  { key: 'status', label: 'Status' },
  { key: 'deliveredAt', label: 'Delivered At' },
  { key: 'onTime', label: 'On Time' },
  { key: 'orderTotal', label: 'Order Total (INR)' },
];

module.exports = { orderReport, deliveryReport, ORDER_CSV_COLUMNS, DELIVERY_CSV_COLUMNS };
