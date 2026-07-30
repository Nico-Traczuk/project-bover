// backend/src/services/metaUpgrade.service.js
const metaUpgradeModel = require('../models/metaUpgrade.model');
const playerModel      = require('../models/player.model');

const UPGRADE_COSTS = {
  vitality_1:   30,
  vitality_2:   60,
  vitality_3:   100,
  power_1:      30,
  power_2:      60,
  power_3:      100,
  swiftness_1:  40,
  swiftness_2:  80,
  lucky_find_1: 50,
  lucky_find_2: 90,
  gold_rush_1:  45,
  gold_rush_2:  85,
  unlock_tank:  50,
};

async function purchaseUpgrade(playerId, upgradeKey) {
  const cost = UPGRADE_COSTS[upgradeKey];
  if (!cost) {
    const err = new Error('Unknown upgrade');
    err.status = 400;
    err.code   = 'UNKNOWN_UPGRADE';
    throw err;
  }

  const existing = await metaUpgradeModel.findByPlayerId(playerId);
  if (existing.includes(upgradeKey)) {
    const err = new Error('Upgrade already purchased');
    err.status = 409;
    err.code   = 'ALREADY_PURCHASED';
    throw err;
  }

  const result = await playerModel.deductGold(playerId, cost);
  if (!result) {
    const err = new Error('Not enough gold');
    err.status = 400;
    err.code   = 'INSUFFICIENT_GOLD';
    throw err;
  }

  await metaUpgradeModel.purchase(playerId, upgradeKey);
  return { upgrade_key: upgradeKey, remaining_gold: result.gold };
}

module.exports = { purchaseUpgrade };
