const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS } = require('../utils/orderStatus');
const { getPagination, paginated } = require('../utils/http');

/** The message a customer sees for each status. */
const STATUS_MESSAGES = {
  [ORDER_STATUS.PENDING]: ['Order placed', 'We have received your order {id}.'],
  [ORDER_STATUS.CONFIRMED]: ['Order confirmed', 'Your order {id} has been confirmed.'],
  [ORDER_STATUS.PROCESSING]: ['Order processing', 'Your order {id} is being packed.'],
  [ORDER_STATUS.SHIPPED]: ['Order shipped', 'Your order {id} has been shipped.'],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: ['Out for delivery', 'Your order {id} is out for delivery today.'],
  [ORDER_STATUS.DELIVERED]: ['Order delivered', 'Your order {id} has been delivered. Thank you!'],
  [ORDER_STATUS.CANCELLED]: ['Order cancelled', 'Your order {id} has been cancelled.'],
};

async function create({ userId, order, type, title, message }) {
  return Notification.create({
    user: userId,
    order: order?._id,
    orderId: order?.orderId,
    type,
    title,
    message,
  });
}

/** Called every time an order's status changes. */
async function notifyCustomerOfStatus(order) {
  const [title, template] = STATUS_MESSAGES[order.status] || ['Order update', 'Order {id} was updated.'];
  return create({
    userId: order.customer._id || order.customer,
    order,
    type: `ORDER_${order.status.toUpperCase().replace(/ /g, '_')}`,
    title,
    message: template.replace('{id}', order.orderId),
  });
}

async function notifyDeliveryAssignment(deliveryPersonId, order) {
  return create({
    userId: deliveryPersonId,
    order,
    type: 'DELIVERY_ASSIGNED',
    title: 'New delivery assigned',
    message: `Order ${order.orderId} has been assigned to you.`,
  });
}

async function listForUser(userId, query) {
  const filter = { user: userId };
  if (query.unreadOnly === 'true') filter.isRead = false;
  const pg = getPagination(query);
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);
  return { ...paginated(items, total, pg), unreadCount };
}

/** Users can only mark THEIR OWN notifications (the user id is part of the query). */
async function markRead(userId, notificationId) {
  const n = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true },
    { new: true }
  );
  if (!n) throw ApiError.notFound('Notification not found');
  return n;
}

async function markAllRead(userId) {
  const result = await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
  return { updated: result.modifiedCount };
}

module.exports = {
  notifyCustomerOfStatus,
  notifyDeliveryAssignment,
  listForUser,
  markRead,
  markAllRead,
  STATUS_MESSAGES,
};
