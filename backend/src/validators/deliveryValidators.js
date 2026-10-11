const { z, objectId, orderIdParam, orderStatus, isoDate, pagination } = require('./common');
// Delivery report filters live in reportValidators.js

const assign = z.object({
  orderId: orderIdParam,
  deliveryPersonId: objectId,
  estimatedDeliveryDate: isoDate.optional(),
});

const updateStatus = z.object({
  status: orderStatus,
  note: z.string().trim().max(300).optional().default(''),
});

const addNote = z.object({
  text: z.string().trim().min(1, 'Note cannot be empty').max(500),
});

const listQuery = z.object({
  scope: z.enum(['active', 'completed', 'all']).optional().default('active'),
  deliveryPersonId: objectId.optional(),
  ...pagination,
});

module.exports = { assign, updateStatus, addNote, listQuery };
