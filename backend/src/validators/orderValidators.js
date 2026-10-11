const { z, objectId, indianMobile, addressSchema, orderStatus, isoDate, pagination } = require('./common');

const MAX_QTY_PER_ITEM = 20;

/**
 * Notice: there is NO price or total field here.
 * The browser only says "which product, how many" — the server works out the money.
 */
const createOrder = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: z
          .number({ invalid_type_error: 'Quantity must be a number' })
          .int('Quantity must be a whole number')
          .min(1, 'Quantity must be at least 1')
          .max(MAX_QTY_PER_ITEM, `You can order at most ${MAX_QTY_PER_ITEM} of one product`),
      })
    )
    .min(1, 'Your order must contain at least one item')
    .max(30, 'Too many different products in one order'),
  shippingAddress: addressSchema.extend({
    recipientName: z.string().trim().min(2, 'Recipient name is required').max(80),
    mobile: indianMobile,
  }),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

const listOrdersQuery = z.object({
  status: orderStatus.optional(),
  q: z.string().trim().max(40).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  ...pagination,
});

const updateStatus = z.object({
  status: orderStatus,
  note: z.string().trim().max(300).optional().default(''),
});

const cancelOrder = z.object({
  reason: z.string().trim().max(300).optional().default(''),
});

module.exports = { createOrder, listOrdersQuery, updateStatus, cancelOrder, MAX_QTY_PER_ITEM };
