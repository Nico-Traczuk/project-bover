// backend/src/models/player.model.js
const db = require('../db/connection');

async function createPlayer({ username, email, passwordHash }) {
  const result = await db.query(
    `INSERT INTO players (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, gold, created_at`,
    [username, email, passwordHash]
  );
  return result.rows[0];
}

async function findByEmail(email) {
  const result = await db.query(
    'SELECT id, username, email, password_hash, gold, created_at, updated_at FROM players WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await db.query(
    'SELECT id, username, email, gold, created_at FROM players WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function addGold(id, amount) {
  const result = await db.query(
    `UPDATE players SET gold = gold + $1, updated_at = NOW()
     WHERE id = $2
     RETURNING gold`,
    [amount, id]
  );
  return result.rows[0];
}

async function deductGold(id, amount) {
  const result = await db.query(
    `UPDATE players SET gold = gold - $1, updated_at = NOW()
     WHERE id = $2 AND gold >= $1
     RETURNING gold`,
    [amount, id]
  );
  return result.rows[0] || null;
}

module.exports = { createPlayer, findByEmail, findById, addGold, deductGold };
