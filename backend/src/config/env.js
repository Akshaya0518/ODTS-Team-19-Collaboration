/**
 * Central place for configuration.
 * Every other file reads settings from here instead of process.env directly,
 * so there is exactly one place to look when something is misconfigured.
 */
require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  deliveryFee: Number(process.env.DELIVERY_FEE ?? 40),
  freeDeliveryThreshold: Number(process.env.FREE_DELIVERY_THRESHOLD ?? 999),
};

config.isProduction = config.nodeEnv === 'production';
config.isDevelopment = config.nodeEnv === 'development';
config.isTest = config.nodeEnv === 'test';

/** Stops the server early with a clear message if required settings are missing. */
function validateEnv() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(', ')}. ` +
        'Copy backend/.env.example to backend/.env and fill in the values.'
    );
  }
  if (config.isProduction && config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
}

module.exports = { config, validateEnv };
