// backend/src/routes/metaUpgrade.routes.js
const { Router }            = require('express');
const metaUpgradeController = require('../controllers/metaUpgrade.controller');
const auth                  = require('../middleware/auth.middleware');

const router = Router();

router.post('/', auth, metaUpgradeController.purchase);

module.exports = router;
