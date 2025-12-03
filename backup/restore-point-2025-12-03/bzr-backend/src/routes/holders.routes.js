const express = require('express');
const holdersController = require('../controllers/holdersController');
const { strictLimiter } = require('../middleware/rateLimiters');
const cacheMiddleware = require('../middleware/cacheMiddleware');

const router = express.Router();

// Cache for 3 minutes (180 seconds)
router.get('/', strictLimiter, cacheMiddleware(180), holdersController.getHolders);

module.exports = router;
