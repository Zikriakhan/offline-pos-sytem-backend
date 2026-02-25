const express = require('express');
const router = express.Router();
const {
	getCurrentUserAllData,
	getAllUsersWithData,
	deleteCurrentUserCustomer,
	deleteUserCustomerAdmin
} = require('../controllers/showAllDataController');
const { auth, requireRole } = require('../middleware/auth');

// Protect all routes
router.use(auth);

// Get current user's complete data
router.get('/me', getCurrentUserAllData);
// Delete a customer for current user
router.delete('/me/customers/:id', deleteCurrentUserCustomer);

// Get all users with their complete data (Admin only)
router.get('/all', requireRole('admin'), getAllUsersWithData);
// Admin: delete a customer for a specific user
router.delete('/users/:userId/customers/:id', requireRole('admin'), deleteUserCustomerAdmin);

module.exports = router;