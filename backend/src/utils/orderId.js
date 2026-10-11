/**
 * Human-friendly order IDs like ODTS-20261009-0042.
 * The running number comes from the Counter collection and is incremented
 * atomically by MongoDB, so two orders can never receive the same number.
 */
const Counter = require('../models/Counter');

/** YYYYMMDD in the server's local time zone (IST on an Indian laptop). */
function dateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatOrderId(stamp, sequence) {
  return `ODTS-${stamp}-${String(sequence).padStart(4, '0')}`;
}

async function generateOrderId(date = new Date()) {
  const stamp = dateStamp(date);
  const counter = await Counter.findOneAndUpdate(
    { _id: `order-${stamp}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return formatOrderId(stamp, counter.seq);
}

const ORDER_ID_PATTERN = /^ODTS-\d{8}-\d{4,}$/;

module.exports = { generateOrderId, formatOrderId, dateStamp, ORDER_ID_PATTERN };
