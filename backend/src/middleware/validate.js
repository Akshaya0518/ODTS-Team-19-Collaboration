const ApiError = require('../utils/ApiError');

/**
 * Checks req.body / req.query / req.params against a zod schema.
 * - Invalid input -> 400 with a list of { field, message }.
 * - Valid input   -> the CLEANED data is stored on req.valid[source]
 *                    (unknown fields are dropped, strings trimmed, numbers converted).
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest(errors[0]?.message || 'Invalid input', errors));
    }
    req.valid = req.valid || {};
    req.valid[source] = result.data;
    return next();
  };
}

module.exports = validate;
