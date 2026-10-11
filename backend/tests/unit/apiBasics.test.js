/**
 * API checks that need NO database: routing, input validation, missing login,
 * security headers and the error format. These run before any DB query happens.
 */
const request = require('supertest');
const createApp = require('../../src/app');

const app = createApp();

describe('API basics (no database)', () => {
  test('UT-API-01 health check responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'ODTS API is running' });
  });

  test('UT-API-02 unknown route -> 404 in the standard error format', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('UT-API-03 protected routes need a login (401)', async () => {
    for (const [method, url] of [
      ['get', '/api/orders/mine'],
      ['post', '/api/orders'],
      ['get', '/api/deliveries'],
      ['get', '/api/notifications'],
      ['get', '/api/dashboard'],
      ['get', '/api/reports/orders'],
    ]) {
      const res = await request(app)[method](url);
      expect(res.status).toBe(401);
    }
  });

  test('UT-API-04 invalid registration is rejected before touching the database (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('UT-API-05 malformed JSON body -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not valid JSON/i);
  });

  test('UT-API-06 query-operator injection in login is rejected (400)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  test('UT-API-07 malformed product id -> 400', async () => {
    const res = await request(app).get('/api/products/not-an-id');
    expect(res.status).toBe(400);
  });

  test('UT-API-08 security headers are set and Express is not advertised', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('UT-API-09 CORS allows only the configured frontend origin with credentials', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    const evil = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    expect(evil.headers['access-control-allow-origin']).not.toBe('http://evil.example');
  });
});
