// backend/src/controllers/player.controller.js
const playerService = require('../services/player.service');

async function getMe(req, res, next) {
  try {
    const data = await playerService.getProfile(req.playerId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
