/**
 * Every number here is CALCULATED FROM MONGODB at request time — nothing is hardcoded.
 */
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { ORDER_STATUS, ALL_STATUSES, FINAL_STATUSES, IN_TRANSIT_STATUSES, trackingLabel } = require('../utils/orderStatus');

async function countByStatus(match = {}) {
  const rows = await Order.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0]));
  for (const r of rows) counts[r._id] = r.count;
  return counts;
}

async function adminStats() {
  const [byStatus, totalProducts, activeProducts, lowStock, totalCustomers, revenueRows, recentOrders, assigned] =
    await Promise.all([
      countByStatus(),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, stock: { $lte: 5 } }),
      User.countDocuments({ role: 'customer' }),
      Order.aggregate([
        { $match: { status: ORDER_STATUS.DELIVERED } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(6).select('orderId status total createdAt customer').populate('customer', 'name'),
      Delivery.distinct('order'),
    ]);

  // Orders that are confirmed/processing but nobody has been assigned yet.
  const awaitingAssignment = await Order.countDocuments({
    status: { $in: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING] },
    _id: { $nin: assigned },
  });

  const totalOrders = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return {
    totalOrders,
    pendingOrders: byStatus[ORDER_STATUS.PENDING],
    inTransitOrders: IN_TRANSIT_STATUSES.reduce((n, s) => n + byStatus[s], 0),
    deliveredOrders: byStatus[ORDER_STATUS.DELIVERED],
    cancelledOrders: byStatus[ORDER_STATUS.CANCELLED],
    awaitingAssignment,
    totalProducts,
    activeProducts,
    lowStockProducts: lowStock,
    totalCustomers,
    deliveredRevenue: revenueRows[0]?.total || 0,
    ordersByStatus: byStatus,
    recentOrders,
  };
}

async function customerStats(user) {
  const [byStatus, recentOrders, currentDeliveries, recentNotifications, unreadNotifications] = await Promise.all([
    countByStatus({ customer: user._id }),
    Order.find({ customer: user._id }).sort({ createdAt: -1 }).limit(5).select('orderId status total createdAt'),
    Order.find({ customer: user._id, status: { $nin: FINAL_STATUSES } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('orderId status total createdAt updatedAt'),
    Notification.find({ user: user._id }).sort({ createdAt: -1 }).limit(5),
    Notification.countDocuments({ user: user._id, isRead: false }),
  ]);
  const totalOrders = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return {
    totalOrders,
    activeOrders: totalOrders - byStatus[ORDER_STATUS.DELIVERED] - byStatus[ORDER_STATUS.CANCELLED],
    deliveredOrders: byStatus[ORDER_STATUS.DELIVERED],
    recentOrders,
    currentDeliveries: currentDeliveries.map((o) => ({ ...o.toObject(), statusLabel: trackingLabel(o.status) })),
    recentNotifications,
    unreadNotifications,
  };
}

async function deliveryStats(user) {
  const deliveries = await Delivery.find({ assignedTo: user._id })
    .populate({ path: 'order', select: 'orderId status total shippingAddress createdAt' })
    .sort({ updatedAt: -1 });
  const valid = deliveries.filter((d) => d.order);
  const active = valid.filter((d) => !FINAL_STATUSES.includes(d.order.status));
  const completed = valid.filter((d) => d.order.status === ORDER_STATUS.DELIVERED);
  return {
    assignedDeliveries: valid.length,
    // "Pending" = assigned to me and not finished yet
    pendingDeliveries: active.length,
    outForDelivery: active.filter((d) => d.order.status === ORDER_STATUS.OUT_FOR_DELIVERY).length,
    completedDeliveries: completed.length,
    activeDeliveries: active.slice(0, 6),
    recentlyCompleted: completed.slice(0, 5),
  };
}

module.exports = { adminStats, customerStats, deliveryStats, countByStatus };
