const express = require('express');
const healthController = require('../controllers/healthController');
const cacheMiddleware = require('../middleware/cacheMiddleware');

const router = express.Router();

router.get('/health', healthController.getHealth);
router.get('/cache-health', healthController.getCacheHealth);
router.get('/token-price', cacheMiddleware(60), healthController.getTokenPrice);
router.get('/finality', healthController.getFinality);
router.post('/cache/invalidate', healthController.invalidateCache);

module.exports = router;
