/** Display rules for order statuses (labels + badge colours). Must match backend/src/utils/orderStatus.js */
export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const META = {
  Pending: { label: 'Order Placed', tone: 'slate', icon: '🧾' },
  Confirmed: { label: 'Confirmed', tone: 'blue', icon: '✔️' },
  Processing: { label: 'Processing', tone: 'violet', icon: '📦' },
  Shipped: { label: 'Shipped', tone: 'amber', icon: '🚚' },
  'Out for Delivery': { label: 'Out for Delivery', tone: 'teal', icon: '🛵' },
  Delivered: { label: 'Delivered', tone: 'green', icon: '🏠' },
  Cancelled: { label: 'Cancelled', tone: 'red', icon: '✖' },
};

export const statusMeta = (status) => META[status] || { label: status, tone: 'slate', icon: '•' };

/** Text for the button that moves an order to `status`. */
export const ACTION_LABELS = {
  Confirmed: 'Confirm order',
  Processing: 'Start processing',
  Shipped: 'Mark as shipped',
  'Out for Delivery': 'Out for delivery',
  Delivered: 'Mark as delivered',
  Cancelled: 'Cancel order',
};

export const FINAL_STATUSES = ['Delivered', 'Cancelled'];
export const ASSIGNABLE_STATUSES = ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery'];

export const ROLE_HOME = { customer: '/customer', admin: '/admin', delivery: '/delivery' };
