// backend/src/models/metaUpgrade.model.js
const db = require('../db/connection');

async function findByPlayerId(playerId) {
  const result = await db.query(
    'SELECT upgrade_key FROM meta_upgrades WHERE player_id = $1',
    [playerId]
  );
  return result.rows.map(r => r.upgrade_key);
}

async function purchase(playerId, upgradeKey) {
  const result = await db.query(
    `INSERT INTO meta_upgrades (player_id, upgrade_key)
     VALUES ($1, $2)
     RETURNING upgrade_key, purchased_at`,
    [playerId, upgradeKey]
  );
  return result.rows[0];
}

module.exports = { findByPlayerId, purchase };
