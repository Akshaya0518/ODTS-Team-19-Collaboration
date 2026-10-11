/**
 * Runs before every test file. Forces safe test settings so tests can NEVER
 * read your real Atlas database from backend/.env (dotenv does not override
 * variables that are already set).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-not-used-anywhere-else-1234567890';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4'; // fast hashing in tests only
process.env.DELIVERY_FEE = '40';
process.env.FREE_DELIVERY_THRESHOLD = '999';
process.env.MONGODB_URI = 'mongodb://placeholder-tests-use-their-own-database';
