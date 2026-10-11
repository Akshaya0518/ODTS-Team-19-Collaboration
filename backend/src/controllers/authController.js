const authService = require('../services/authService');
const { sendSuccess } = require('../utils/http');
const { signToken, cookieOptions, COOKIE_NAME } = require('../middleware/auth');
const { config } = require('../config/env');

function startSession(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
}

async function register(req, res) {
  const user = await authService.registerCustomer(req.valid.body);
  startSession(res, user);
  sendSuccess(res, { status: 201, message: 'Account created successfully', data: { user } });
}

async function login(req, res) {
  const user = await authService.login(req.valid.body);
  startSession(res, user);
  sendSuccess(res, { message: 'Logged in successfully', data: { user } });
}

async function logout(_req, res) {
  const { maxAge, ...options } = cookieOptions(); // clearCookie must not receive maxAge
  void maxAge;
  res.clearCookie(COOKIE_NAME, options);
  sendSuccess(res, { message: 'Logged out' });
}

async function me(req, res) {
  sendSuccess(res, { data: { user: req.user } });
}

/**
 * DEMO PASSWORD RESET (no email service is configured).
 * - The response is ALWAYS the same, whether or not the email exists (no account discovery).
 * - In development ONLY, the reset link is printed in the backend terminal and returned
 *   as "devResetUrl" so it can be demonstrated. In production nothing secret is returned.
 */
async function forgotPassword(req, res) {
  const token = await authService.requestPasswordReset(req.valid.body.email);
  const data = {};
  if (token && config.isDevelopment) {
    const url = `${config.clientOrigin}/reset-password?token=${token}`;
    console.log(`\n[DEV ONLY] Password reset link for ${req.valid.body.email}:\n${url}\n`);
    data.devResetUrl = url;
  }
  sendSuccess(res, {
    message: `If an account exists for this email, a reset link has been generated. It expires in ${authService.RESET_TOKEN_MINUTES} minutes.`,
    data,
  });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.valid.body);
  sendSuccess(res, { message: 'Password updated. You can now log in with your new password.' });
}

module.exports = { register, login, logout, me, forgotPassword, resetPassword };
