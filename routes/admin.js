const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Validation middleware

// Dashboard and statistics
router.get('/main', adminController.getDashboardStats);
router.put('/main', adminController.updateAdminSettings);
router.post('/pagenation', adminController.getTablePagenation);

// User management
router.put('/users/:id', adminController.updateUser);

router.post('/approve', adminController.ApproveWithdrawal);
router.post('/reject', adminController.RejectWithdrawal);


module.exports = router; 