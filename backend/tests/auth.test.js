// backend/tests/auth.test.js
const request = require('supertest');
const app     = require('../src/app');

describe('POST /api/auth/register', () => {
  it('creates a player and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testplayer', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.player.username).toBe('testplayer');
    expect(res.body.data.player.password_hash).toBeUndefined();
  });

  it('returns 409 if email already exists', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'player1', email: 'dup@example.com', password: 'pass123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'player2', email: 'dup@example.com', password: 'pass123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'logintest', email: 'login@example.com', password: 'password123' });
  });

  it('returns token with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.player.email).toBe('login@example.com');
    expect(res.body.data.player.password_hash).toBeUndefined();
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 with unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
