const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { strictLimiter } = require('../middleware/rateLimiters');

router.get('/search', strictLimiter, searchController.search);

module.exports = router;
