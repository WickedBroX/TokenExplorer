const express = require('express');
const router = express.Router();
const transfersController = require('../controllers/transfersController');

router.get('/transfers', transfersController.getTransfers);

module.exports = router;
