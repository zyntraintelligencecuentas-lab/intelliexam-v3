const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.put('/profile', requireAuth, authController.updateProfile);

module.exports = router;
