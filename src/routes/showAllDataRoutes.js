const express = require('express');
const router = express.Router();
const { getCurrentUserAllData, getAllUsersWithData } = require('../controllers/showAllDataController');
const { auth, requireRole } = require('../middleware/auth');

// Protect all routes
router.use(auth);

// Get current user's complete data
router.get('/me', getCurrentUserAllData);

// Get all users with their complete data (Admin only)
router.get('/all', requireRole('admin'), getAllUsersWithData);

module.exports = router;