// backend/src/controllers/run.controller.js
const runService = require('../services/run.service');

async function saveRun(req, res, next) {
  try {
    const data = await runService.saveRun(req.playerId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const runs = await runService.getRunHistory(req.playerId);
    res.json({ success: true, data: { runs } });
  } catch (err) {
    next(err);
  }
}

module.exports = { saveRun, getHistory };
