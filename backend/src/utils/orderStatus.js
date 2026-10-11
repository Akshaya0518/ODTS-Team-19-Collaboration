/**
 * ORDER STATUS RULES — the single source of truth for the order life cycle.
 *
 * Think of this as a railway map: an order can only move along the tracks
 * drawn here, and each track says WHO is allowed to move it.
 */
const ApiError = require('./ApiError');

const ORDER_STATUS = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
});

const ALL_STATUSES = Object.values(ORDER_STATUS);

/** Statuses after which nothing can change. */
const FINAL_STATUSES = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];

/** Statuses that count as "in transit" on dashboards. */
const IN_TRANSIT_STATUSES = [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY];

/** Statuses in which an admin may assign (or reassign) a delivery person. */
const ASSIGNABLE_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
];

/**
 * Allowed transitions: TRANSITIONS[from][to] = roles allowed to make that move.
 * Anything not listed here is rejected.
 */
const TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: {
    [ORDER_STATUS.CONFIRMED]: ['admin'],
    [ORDER_STATUS.CANCELLED]: ['admin', 'customer'],
  },
  [ORDER_STATUS.CONFIRMED]: {
    [ORDER_STATUS.PROCESSING]: ['admin'],
    [ORDER_STATUS.CANCELLED]: ['admin', 'customer'],
  },
  [ORDER_STATUS.PROCESSING]: {
    [ORDER_STATUS.SHIPPED]: ['admin'],
    [ORDER_STATUS.CANCELLED]: ['admin'],
  },
  [ORDER_STATUS.SHIPPED]: {
    [ORDER_STATUS.OUT_FOR_DELIVERY]: ['admin', 'delivery'],
  },
  [ORDER_STATUS.OUT_FOR_DELIVERY]: {
    [ORDER_STATUS.DELIVERED]: ['admin', 'delivery'],
  },
  [ORDER_STATUS.DELIVERED]: {},
  [ORDER_STATUS.CANCELLED]: {},
});

/** The six steps shown on the customer's tracking timeline (cancellation is shown separately). */
const TRACKING_STEPS = Object.freeze([
  { status: ORDER_STATUS.PENDING, label: 'Order Placed' },
  { status: ORDER_STATUS.CONFIRMED, label: 'Order Confirmed' },
  { status: ORDER_STATUS.PROCESSING, label: 'Processing' },
  { status: ORDER_STATUS.SHIPPED, label: 'Shipped' },
  { status: ORDER_STATUS.OUT_FOR_DELIVERY, label: 'Out for Delivery' },
  { status: ORDER_STATUS.DELIVERED, label: 'Delivered' },
]);

/**
 * Checks whether a status change is allowed. Throws an ApiError if not.
 * This function is used for the cyclomatic complexity analysis (Stage 7).
 *
 * @param {object} p
 * @param {string} p.from          current status
 * @param {string} p.to            requested status
 * @param {string} p.role          role of the user making the change
 * @param {boolean} p.hasAssignment does the order have a delivery person?
 * @param {boolean} p.isAssignee   is the user the assigned delivery person?
 */
function assertTransitionAllowed({ from, to, role, hasAssignment, isAssignee }) {
  if (!ALL_STATUSES.includes(to)) {
    throw ApiError.badRequest(`"${to}" is not a valid order status`);
  }
  if (from === to) {
    throw ApiError.conflict(`Order is already "${to}"`);
  }
  const allowedRoles = (TRANSITIONS[from] || {})[to];
  if (!allowedRoles) {
    throw ApiError.conflict(`Order status cannot change from "${from}" to "${to}"`);
  }
  if (!allowedRoles.includes(role)) {
    throw ApiError.forbidden(`Your role cannot change an order from "${from}" to "${to}"`);
  }
  if (role === 'delivery' && !isAssignee) {
    throw ApiError.forbidden('This delivery is not assigned to you');
  }
  if (to === ORDER_STATUS.SHIPPED && !hasAssignment) {
    throw ApiError.conflict('Assign a delivery person before marking the order as shipped');
  }
  return true;
}

/** Lists the statuses a given role could move an order to next (used to build buttons in the UI). */
function nextStatusesFor(from, role) {
  const options = TRANSITIONS[from] || {};
  return Object.keys(options).filter((to) => options[to].includes(role));
}

/** Label shown to customers (e.g. "Pending" is shown as "Order Placed"). */
function trackingLabel(status) {
  const step = TRACKING_STEPS.find((s) => s.status === status);
  return step ? step.label : status;
}

module.exports = {
  ORDER_STATUS,
  ALL_STATUSES,
  FINAL_STATUSES,
  IN_TRANSIT_STATUSES,
  ASSIGNABLE_STATUSES,
  TRANSITIONS,
  TRACKING_STEPS,
  assertTransitionAllowed,
  nextStatusesFor,
  trackingLabel,
};
