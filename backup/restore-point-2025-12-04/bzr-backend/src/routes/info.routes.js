const express = require('express');
const router = express.Router();
const infoController = require('../controllers/infoController');
const { strictLimiter } = require('../middleware/rateLimiters');
const cacheMiddleware = require('../middleware/cacheMiddleware');

router.get('/info', strictLimiter, cacheMiddleware(300), infoController.getTokenInfo);
router.get('/price', infoController.getTokenPrice);

module.exports = router;
