const { z } = require('zod');
const { ALL_STATUSES } = require('../utils/orderStatus');

/** A MongoDB id is 24 hexadecimal characters. */
const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const orderIdParam = z.string().trim().regex(/^ODTS-\d{8}-\d{4,}$/, 'Invalid order ID format');

const indianMobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const pincode = z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits');

const addressSchema = z.object({
  line1: z.string().trim().min(5, 'Address is too short').max(200),
  city: z.string().trim().min(2, 'City is required').max(80),
  state: z.string().trim().min(2, 'State is required').max(80),
  pincode,
});

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password needs a lower-case letter')
  .regex(/[A-Z]/, 'Password needs an upper-case letter')
  .regex(/\d/, 'Password needs a number');

const orderStatus = z.enum(ALL_STATUSES, {
  errorMap: () => ({ message: `Status must be one of: ${ALL_STATUSES.join(', ')}` }),
});

/** YYYY-MM-DD dates used by report filters. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');

const pagination = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

const idParams = z.object({ id: objectId });
const orderIdParams = z.object({ orderId: orderIdParam });

module.exports = {
  z,
  objectId,
  orderIdParam,
  indianMobile,
  pincode,
  addressSchema,
  strongPassword,
  orderStatus,
  isoDate,
  pagination,
  idParams,
  orderIdParams,
};
