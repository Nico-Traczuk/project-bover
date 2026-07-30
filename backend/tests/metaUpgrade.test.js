// backend/tests/metaUpgrade.test.js
const request = require('supertest');
const app     = require('../src/app');
const db      = require('../src/db/connection');

async function setupPlayer(gold = 100) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'upgrader', email: 'upgrader@example.com', password: 'password123' });

  const token    = res.body.data.token;
  const playerId = res.body.data.player.id;

  if (gold > 0) {
    await db.query('UPDATE players SET gold = $1 WHERE id = $2', [gold, playerId]);
  }

  return { token, playerId };
}

describe('POST /api/meta-upgrades', () => {
  it('purchases an upgrade and deducts gold', async () => {
    const { token } = await setupPlayer(100);

    const res = await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.upgrade_key).toBe('vitality_1');
    expect(res.body.data.remaining_gold).toBe(70);
  });

  it('returns 400 if insufficient gold', async () => {
    const { token } = await setupPlayer(10);

    const res = await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_GOLD');
  });

  it('returns 409 if upgrade already purchased', async () => {
    const { token } = await setupPlayer(200);

    await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    const res = await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_PURCHASED');
  });

  it('returns 400 for unknown upgrade key', async () => {
    const { token } = await setupPlayer(100);

    const res = await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'invalid_upgrade' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_UPGRADE');
  });

  it('upgrade appears in GET /api/players/me after purchase', async () => {
    const { token } = await setupPlayer(100);

    await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    const res = await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.meta_upgrades).toContain('vitality_1');
    expect(res.body.data.gold).toBe(70);
  });
});
