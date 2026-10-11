const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { config } = require('../config/env');

const RESET_TOKEN_MINUTES = 15;

const hashPassword = (plain) => bcrypt.hash(plain, config.bcryptRounds);

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

/** Public registration ALWAYS creates a customer. Admins/delivery staff are created by an admin or the seed script. */
async function registerCustomer({ name, email, mobile, password, address }) {
  const exists = await User.exists({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists');
  const passwordHash = await hashPassword(password);
  return User.create({ name, email, mobile, address, passwordHash, role: 'customer' });
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for "no such email" and "wrong password" so attackers cannot discover emails.
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Contact the administrator.');
  return user;
}

/**
 * Creates a one-time reset token. Only its SHA-256 hash is stored, so a database
 * leak does not reveal usable reset links. Returns the plain token (or null if the
 * email is unknown) — the CONTROLLER decides whether it may be shown (development only).
 */
async function requestPasswordReset(email) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return null;
  const token = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = sha256(token);
  user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
  await user.save();
  return token;
}

async function resetPassword({ token, password }) {
  const user = await User.findOne({
    resetTokenHash: sha256(token),
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires');
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');
  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  return user;
}

module.exports = {
  registerCustomer,
  login,
  requestPasswordReset,
  resetPassword,
  hashPassword,
  RESET_TOKEN_MINUTES,
};
