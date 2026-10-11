const mongoose = require('mongoose');

/** Stores running numbers, e.g. { _id: "order-20261009", seq: 42 }. Used for order IDs. */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
