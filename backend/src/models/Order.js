const mongoose = require('mongoose');
const { ALL_STATUSES, ORDER_STATUS } = require('../utils/orderStatus');

/**
 * Each item is a SNAPSHOT of the product at purchase time.
 * If the admin changes the price tomorrow, old orders still show what the customer paid.
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

/** One entry is added every time the status changes: who, what, when. */
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ALL_STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    recipientName: { type: String, trim: true, required: true },
    mobile: { type: String, trim: true, required: true },
    line1: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    pincode: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'Order needs at least one item' },
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    shippingAddress: { type: shippingAddressSchema, required: true },
    status: { type: String, enum: ALL_STATUSES, default: ORDER_STATUS.PENDING, index: true },
    statusHistory: [statusHistorySchema],
    cancelReason: { type: String, trim: true, maxlength: 300 },
    // Random key sent by the browser per checkout; stops double-clicks creating two orders.
    // If the client sends none, the server generates one so the unique index always works.
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customer: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model('Order', orderSchema);
