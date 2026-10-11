const { z, objectId, orderStatus, isoDate } = require('./common');

const fromBeforeTo = [
  (d) => !d.from || !d.to || d.from <= d.to,
  { message: '"from" date must be on or before "to" date', path: ['from'] },
];

const orderReportQuery = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    status: orderStatus.optional(),
    format: z.enum(['json', 'csv']).optional().default('json'),
  })
  .refine(...fromBeforeTo);

const deliveryReportQuery = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    status: orderStatus.optional(),
    deliveryPersonId: objectId.optional(),
    format: z.enum(['json', 'csv']).optional().default('json'),
  })
  .refine(...fromBeforeTo);

module.exports = { orderReportQuery, deliveryReportQuery };
