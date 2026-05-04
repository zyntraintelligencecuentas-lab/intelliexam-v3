const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', settingsController.getSettings);
router.put('/profile', settingsController.updateProfile);
router.put('/password', settingsController.updatePassword);

module.exports = router;
