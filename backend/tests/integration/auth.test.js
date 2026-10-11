/**
 * MODULE 1 — Authentication and authorization (API integration tests)
 * Uses a real (in-memory or *_test) MongoDB database. See tests/setup/db.js.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const User = require('../../src/models/User');
const authService = require('../../src/services/authService');
const { connectTestDB, clearTestDB, closeTestDB } = require('../setup/db');
const { createUser, authHeader, address, PASSWORD } = require('../setup/factories');

const app = createApp();

const registration = (overrides = {}) => ({
  name: 'Arun Kumar',
  email: 'arun@example.com',
  mobile: '9876543210',
  password: 'Secret@123',
  confirmPassword: 'Secret@123',
  address,
  ...overrides,
});

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe('POST /api/auth/register', () => {
  test('TC-AUTH-01 valid registration creates a customer, hashes the password and logs in', async () => {
    const res = await request(app).post('/api/auth/register').send(registration());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ email: 'arun@example.com', role: 'customer' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/odts_token=.+HttpOnly/i);

    const stored = await User.findOne({ email: 'arun@example.com' }).select('+passwordHash');
    expect(stored.passwordHash).not.toBe('Secret@123');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
  });

  test('TC-AUTH-02 duplicate email is rejected with 409', async () => {
    await request(app).post('/api/auth/register').send(registration());
    const res = await request(app).post('/api/auth/register').send(registration({ name: 'Someone Else' }));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('TC-AUTH-03 email is case-insensitive for duplicates (boundary)', async () => {
    await request(app).post('/api/auth/register').send(registration());
    const res = await request(app).post('/api/auth/register').send(registration({ email: 'ARUN@Example.com' }));
    expect(res.status).toBe(409);
  });

  test('TC-AUTH-04 missing required fields returns 400 with field errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'mobile', 'password', 'address']));
  });

  test('TC-AUTH-05 weak password is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(registration({ password: 'password', confirmPassword: 'password' }));
    expect(res.status).toBe(400);
  });

  test('TC-AUTH-06 a "role": "admin" field is ignored (no self-promotion)', async () => {
    const res = await request(app).post('/api/auth/register').send(registration({ role: 'admin' }));
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('customer');
  });
});

describe('POST /api/auth/login and session', () => {
  test('TC-AUTH-07 valid login returns the user and an httpOnly cookie that works for /me', async () => {
    await createUser({ email: 'login@example.com' });
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email: 'login@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('login@example.com');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('login@example.com');
  });

  test('TC-AUTH-08 incorrect password returns 401 with a generic message', async () => {
    await createUser({ email: 'login@example.com' });
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'Wrong@1234' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('TC-AUTH-09 unknown email returns the SAME 401 message (no account discovery)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('TC-AUTH-10 deactivated account cannot log in', async () => {
    await createUser({ email: 'off@example.com', isActive: false });
    const res = await request(app).post('/api/auth/login').send({ email: 'off@example.com', password: PASSWORD });
    expect(res.status).toBe(403);
  });

  test('TC-AUTH-11 logout clears the cookie so /me returns 401', async () => {
    await createUser({ email: 'login@example.com' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'login@example.com', password: PASSWORD });
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});

describe('Token checks and role-based authorization', () => {
  test('TC-AUTH-12 no token -> 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('TC-AUTH-13 invalid (tampered) token -> 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('TC-AUTH-14 expired token -> 401 with "expired" message', async () => {
    const user = await createUser();
    const expired = jwt.sign(
      { sub: String(user._id), role: user.role, exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET
    );
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('TC-AUTH-15 customer calling an admin endpoint -> 403', async () => {
    const customer = await createUser();
    const res = await request(app).get('/api/orders').set(authHeader(customer));
    expect(res.status).toBe(403);
  });

  test('TC-AUTH-16 delivery person cannot create products -> 403', async () => {
    const courier = await createUser({ role: 'delivery' });
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(courier))
      .send({ name: 'Hack', category: 'a'.repeat(24), price: 1, stock: 1 });
    expect(res.status).toBe(403);
  });

  test('TC-AUTH-17 role comes from the database, not the token (demoted admin loses access)', async () => {
    const user = await createUser({ role: 'admin' });
    const headers = authHeader(user); // token says "admin"
    await User.updateOne({ _id: user._id }, { role: 'customer' });
    const res = await request(app).get('/api/orders').set(headers);
    expect(res.status).toBe(403);
  });
});

describe('Password reset (demo flow)', () => {
  test('TC-AUTH-18 forgot-password gives the same answer for unknown emails and leaks no token outside development', async () => {
    await createUser({ email: 'known@example.com' });
    const known = await request(app).post('/api/auth/forgot-password').send({ email: 'known@example.com' });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'unknown@example.com' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(known.body.data.devResetUrl).toBeUndefined();
  });

  test('TC-AUTH-19 a reset token changes the password once and cannot be reused', async () => {
    await createUser({ email: 'reset@example.com' });
    const token = await authService.requestPasswordReset('reset@example.com');
    const body = { token, password: 'NewPass@123', confirmPassword: 'NewPass@123' };

    const first = await request(app).post('/api/auth/reset-password').send(body);
    expect(first.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: 'NewPass@123' });
    expect(login.status).toBe(200);

    const reused = await request(app).post('/api/auth/reset-password').send(body);
    expect(reused.status).toBe(400);
  });

  test('TC-AUTH-20 an expired reset token is rejected', async () => {
    await createUser({ email: 'reset@example.com' });
    const token = await authService.requestPasswordReset('reset@example.com');
    await User.updateOne({ email: 'reset@example.com' }, { resetTokenExpires: new Date(Date.now() - 1000) });
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'NewPass@123', confirmPassword: 'NewPass@123' });
    expect(res.status).toBe(400);
  });
});
