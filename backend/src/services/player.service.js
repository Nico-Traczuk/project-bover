// backend/src/services/player.service.js
const playerModel      = require('../models/player.model');
const metaUpgradeModel = require('../models/metaUpgrade.model');

async function getProfile(playerId) {
  const player = await playerModel.findById(playerId);
  if (!player) {
    const err = new Error('Player not found');
    err.status = 404;
    err.code   = 'PLAYER_NOT_FOUND';
    throw err;
  }

  const metaUpgrades = await metaUpgradeModel.findByPlayerId(playerId);
  return { ...player, meta_upgrades: metaUpgrades };
}

module.exports = { getProfile };
