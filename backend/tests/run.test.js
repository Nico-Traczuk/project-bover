// backend/tests/run.test.js
const request = require('supertest');
const app     = require('../src/app');

async function setupPlayer() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'runner', email: 'runner@example.com', password: 'password123' });
  return res.body.data.token;
}

describe('POST /api/runs', () => {
  it('saves run and adds gold to player total', async () => {
    const token = await setupPlayer();

    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        class:         'mage',
        gold_earned:   45,
        rooms_cleared: 4,
        depth_reached: 4,
        boss_defeated: false
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.run.gold_earned).toBe(45);
    expect(res.body.data.run.class).toBe('mage');
    expect(res.body.data.new_total_gold).toBe(45);
  });

  it('accumulates gold across multiple runs', async () => {
    const token = await setupPlayer();

    await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'mage', gold_earned: 30, rooms_cleared: 2, depth_reached: 2, boss_defeated: false });

    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'mage', gold_earned: 50, rooms_cleared: 5, depth_reached: 5, boss_defeated: true });

    expect(res.body.data.new_total_gold).toBe(80);
  });

  it('returns 400 for invalid class', async () => {
    const token = await setupPlayer();

    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'wizard', gold_earned: 10, rooms_cleared: 1, depth_reached: 1, boss_defeated: false });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CLASS');
  });
});

describe('GET /api/runs/me', () => {
  it('returns run history in descending order', async () => {
    const token = await setupPlayer();

    await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'mage', gold_earned: 30, rooms_cleared: 3, depth_reached: 3, boss_defeated: false });

    await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'tank', gold_earned: 60, rooms_cleared: 6, depth_reached: 6, boss_defeated: true });

    const res = await request(app)
      .get('/api/runs/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.runs).toHaveLength(2);
    expect(res.body.data.runs[0].class).toBe('tank');
  });

  it('returns empty array when no runs', async () => {
    const token = await setupPlayer();

    const res = await request(app)
      .get('/api/runs/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.runs).toHaveLength(0);
  });
});
