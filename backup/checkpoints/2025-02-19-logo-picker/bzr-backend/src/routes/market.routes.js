'use strict';

const express = require('express');
const marketController = require('../controllers/marketController');

const router = express.Router();

router.get('/market/overview', marketController.getOverview);

module.exports = router;
