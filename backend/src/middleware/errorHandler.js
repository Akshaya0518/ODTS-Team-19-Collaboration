/**
 * The last stop for every error. It decides the HTTP status code and
 * makes sure internal details (stack traces) never reach users in production.
 */
const ApiError = require('../utils/ApiError');
const { config } = require('../config/env');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function toApiError(err) {
  if (err instanceof ApiError) return err;
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') return ApiError.badRequest('Request body is not valid JSON');
  // Mongoose schema validation failed
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest(errors[0]?.message || 'Invalid data', errors);
  }
  // A malformed MongoDB id reached a query
  if (err.name === 'CastError') return ApiError.badRequest(`Invalid value for ${err.path}`);
  // Unique index violation (e.g. duplicate email or category name)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`A record with this ${field} already exists`);
  }
  return null;
}

// Express recognises an error handler by its 4 arguments, so _next must stay.
function errorHandler(err, req, res, _next) {
  const apiError = toApiError(err);
  if (!apiError) {
    if (!config.isTest) console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on the server. Please try again.',
      ...(config.isDevelopment && { debug: err.message, stack: err.stack }),
    });
  }
  return res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(apiError.errors && { errors: apiError.errors }),
  });
}

module.exports = { notFound, errorHandler };
