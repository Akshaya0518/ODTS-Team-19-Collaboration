const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

/**
 * Slows down password guessing: at most 20 login/register/reset attempts
 * per IP address every 15 minutes. Disabled while running automated tests.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' },
});

module.exports = { authLimiter };
