/**
 * Small helpers that keep every controller short and every response the same shape:
 *   success: { success: true, message, data }
 *   error:   { success: false, message, errors? }   (see middleware/errorHandler.js)
 */

/** Wraps an async route handler so thrown errors reach the error middleware (Express 4 needs this). */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function sendSuccess(res, { status = 200, message = 'OK', data = null } = {}) {
  return res.status(status).json({ success: true, message, data });
}

/** Turns page/limit query values into safe numbers. */
function getPagination(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function paginated(items, total, { page, limit }) {
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Escapes user text before it is used inside a regular expression (prevents regex injection). */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Rounds money to 2 decimal places to avoid floating point noise (0.1 + 0.2 problem). */
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

module.exports = { asyncHandler, sendSuccess, getPagination, paginated, escapeRegex, roundMoney };
