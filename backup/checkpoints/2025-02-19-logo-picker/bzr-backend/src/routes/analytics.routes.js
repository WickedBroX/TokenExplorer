const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const cacheMiddleware = require('../middleware/cacheMiddleware');

const router = express.Router();

// Cache for 60 seconds
router.get('/', cacheMiddleware(60), analyticsController.getAnalytics);

module.exports = router;
