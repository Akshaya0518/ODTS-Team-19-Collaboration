/**
 * AUTHENTICATION  = "who are you?"      -> authenticate
 * AUTHORIZATION   = "are you allowed?"  -> authorize('admin', ...)
 *
 * The login token (JWT) arrives in an httpOnly cookie set by the server.
 * An "Authorization: Bearer <token>" header is also accepted (handy for API tools and tests).
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { config } = require('../config/env');

const COOKIE_NAME = 'odts_token';

function readToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

async function resolveUser(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Your session has expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid login token. Please log in again.');
  }
  // The role is read from the DATABASE, never trusted from the token or request body.
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account not found or disabled. Please log in again.');
  }
  return user;
}

/** Requires a valid login. Puts the user on req.user. */
async function authenticate(req, _res, next) {
  try {
    const token = readToken(req);
    if (!token) throw ApiError.unauthorized();
    req.user = await resolveUser(token);
    next();
  } catch (err) {
    next(err);
  }
}

/** Like authenticate, but lets anonymous visitors through (used by the public catalogue). */
async function optionalAuthenticate(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    req.user = await resolveUser(token);
  } catch {
    req.user = undefined; // an old cookie should not break public pages
  }
  return next();
}

/** Allows only the listed roles. Always use AFTER authenticate. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to access this resource'));
    }
    return next();
  };
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser cannot read it -> safer against XSS token theft
  sameSite: 'lax', // not sent on cross-site POST requests -> basic CSRF protection
  secure: config.cookieSecure, // true when served over HTTPS
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
});

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  signToken,
  cookieOptions,
  COOKIE_NAME,
};
