const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .isLength({ min: 3 })
    .withMessage('Password must be at least 3 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const passwordValidation = [
  body('password')
    .isLength({ min: 3 })
    .withMessage('Password must be at least 6 characters long')
];

const walletValidation = [
  body('wallet_address')
    .isEthereumAddress()
    .withMessage('Please enter a valid wallet address')
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/landing', authController.getLandingData);
router.get('/verify-email/:token', authController.verifyEmail);

router.post('/forgot-password', authController.forgotPassword);
// router.post('/resend-verification', authController.resendVerification);
router.post('/reset-password', authController.resetPassword);

// // Protected routes
// router.post('/connect-wallet', authenticateToken, walletValidation, authController.connectWallet);
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.currentUser);

module.exports = router; 