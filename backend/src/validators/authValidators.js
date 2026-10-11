const { z, indianMobile, addressSchema, strongPassword } = require('./common');

/**
 * Note: unknown fields (like "role": "admin") are silently REMOVED by zod.
 * That is how we stop "mass assignment" — a customer can never make themself an admin.
 */
const register = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    mobile: indianMobile,
    password: strongPassword,
    confirmPassword: z.string(),
    address: addressSchema,
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const login = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPassword = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

const resetPassword = z
  .object({
    token: z.string().trim().regex(/^[a-f\d]{64}$/i, 'Invalid or expired reset link'),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

module.exports = { register, login, forgotPassword, resetPassword };
