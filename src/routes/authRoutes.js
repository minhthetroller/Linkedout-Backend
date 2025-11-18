const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup/step1', authController.signupStep1);
router.post('/login', authController.login);

// Protected routes (require authentication)
router.post('/signup/step2', verifyToken, authController.signupStep2);
router.post('/signup/step3', verifyToken, authController.signupStep3);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
