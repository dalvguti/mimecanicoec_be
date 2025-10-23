const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorizeAdmin } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/password', protect, authController.updatePassword);

module.exports = router;

