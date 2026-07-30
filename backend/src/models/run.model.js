// backend/src/models/run.model.js
const db = require('../db/connection');

async function createRun({ playerId, className, goldEarned, roomsCleared, depthReached, bossDefeated }) {
  const result = await db.query(
    `INSERT INTO runs (player_id, class, gold_earned, rooms_cleared, depth_reached, boss_defeated)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [playerId, className, goldEarned, roomsCleared, depthReached, bossDefeated]
  );
  return result.rows[0];
}

async function findByPlayerId(playerId) {
  const result = await db.query(
    'SELECT * FROM runs WHERE player_id = $1 ORDER BY created_at DESC',
    [playerId]
  );
  return result.rows;
}

module.exports = { createRun, findByPlayerId };
