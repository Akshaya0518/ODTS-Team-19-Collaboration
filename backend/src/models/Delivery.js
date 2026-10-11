const mongoose = require('mongoose');

/**
 * Delivery = the "who delivers it and when" part of an order.
 * The current STATUS lives on the Order (one source of truth), so the
 * tracking page, the admin page and the delivery app can never disagree.
 */
const deliverySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignmentHistory: [
      {
        _id: false,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    estimatedDeliveryDate: { type: Date },
    notes: [
      {
        _id: false,
        text: { type: String, trim: true, maxlength: 500 },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Delivery', deliverySchema);
