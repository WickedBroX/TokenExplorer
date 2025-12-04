'use strict';

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { strictLimiter } = require('../middleware/rateLimiters');

// Auth
router.post('/auth/login', strictLimiter, adminController.login);
router.post('/auth/logout', requireAdminAuth, adminController.logout);

// Settings
router.get('/settings', requireAdminAuth, adminController.getSettings);
router.put('/settings', requireAdminAuth, adminController.updateSettingsController);

// API keys
router.get('/api-keys', requireAdminAuth, adminController.listApiKeys);
router.put('/api-keys/:provider', requireAdminAuth, adminController.updateApiKey);
router.delete('/api-keys/:provider', requireAdminAuth, adminController.removeApiKey);

// Backup & restore
router.post('/backup', requireAdminAuth, adminController.backup);
router.post('/restore', requireAdminAuth, adminController.restore);

// Public config for frontend to read
router.get('/config', adminController.publicConfig);

module.exports = router;
