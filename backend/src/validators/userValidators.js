const { z, indianMobile, addressSchema, strongPassword, pagination } = require('./common');

const updateProfile = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    mobile: indianMobile.optional(),
    address: addressSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const createDeliveryPerson = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  mobile: indianMobile,
  password: strongPassword,
});

const listUsersQuery = z.object({
  role: z.enum(['customer', 'delivery', 'admin']).optional(),
  q: z.string().trim().max(80).optional(),
  ...pagination,
});

const setActive = z.object({ isActive: z.boolean() });

module.exports = { updateProfile, createDeliveryPerson, listUsersQuery, setActive };
