// backend/src/controllers/metaUpgrade.controller.js
const metaUpgradeService = require('../services/metaUpgrade.service');

async function purchase(req, res, next) {
  try {
    const { upgrade_key } = req.body;
    const data = await metaUpgradeService.purchaseUpgrade(req.playerId, upgrade_key);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { purchase };
