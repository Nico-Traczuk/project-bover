// backend/src/routes/player.routes.js
const { Router }       = require('express');
const playerController = require('../controllers/player.controller');
const auth             = require('../middleware/auth.middleware');

const router = Router();

router.get('/me', auth, playerController.getMe);

module.exports = router;
