// backend/tests/player.test.js
const request = require('supertest');
const app     = require('../src/app');

async function registerAndGetToken() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'player', email: 'player@example.com', password: 'password123' });
  return res.body.data.token;
}

describe('GET /api/players/me', () => {
  it('returns player profile with empty meta upgrades', async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('player');
    expect(res.body.data.gold).toBe(0);
    expect(res.body.data.meta_upgrades).toEqual([]);
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/players/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/players/me')
      .set('Authorization', 'Bearer not_a_real_token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
