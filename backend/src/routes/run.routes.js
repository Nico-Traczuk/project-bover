// backend/src/routes/run.routes.js
const { Router }    = require('express');
const runController = require('../controllers/run.controller');
const auth          = require('../middleware/auth.middleware');

const router = Router();

router.post('/',  auth, runController.saveRun);
router.get('/me', auth, runController.getHistory);

module.exports = router;
