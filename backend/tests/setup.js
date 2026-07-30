// backend/tests/setup.js
const db = require('../src/db/connection');

afterEach(async () => {
  await db.query('DELETE FROM runs');
  await db.query('DELETE FROM meta_upgrades');
  await db.query('DELETE FROM players');
});

afterAll(async () => {
  await db.end();
});
