// backend/src/services/run.service.js
const runModel    = require('../models/run.model');
const playerModel = require('../models/player.model');

const VALID_CLASSES = ['mage', 'tank'];

async function saveRun(playerId, { class: className, gold_earned, rooms_cleared, depth_reached, boss_defeated }) {
  if (!VALID_CLASSES.includes(className)) {
    const err = new Error('Invalid class');
    err.status = 400;
    err.code   = 'INVALID_CLASS';
    throw err;
  }

  const run                      = await runModel.createRun({ playerId, className, goldEarned: gold_earned, roomsCleared: rooms_cleared, depthReached: depth_reached, bossDefeated: boss_defeated });
  const { gold: new_total_gold } = await playerModel.addGold(playerId, gold_earned);

  return { run, new_total_gold };
}

async function getRunHistory(playerId) {
  return runModel.findByPlayerId(playerId);
}

module.exports = { saveRun, getRunHistory };
