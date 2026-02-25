const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserPermissions,
  updateUserPermissions,
  updateUserRole,
  getAvailablePermissions,
  getAllRoles,
  assignDefaultPermissions
} = require('../controllers/permissionController');
const { auth, requireOwner } = require('../middleware/auth');

// All routes require authentication and owner role
router.use(auth);
router.use(requireOwner);

// Get all users
router.get('/users', getAllUsers);

// Get user's permissions
router.get('/users/:userId/permissions', getUserPermissions);

// Update user permissions
router.put('/users/:userId/permissions', updateUserPermissions);

// Update user role
router.put('/users/:userId/role', updateUserRole);

// Assign default permissions by role
router.post('/users/:userId/assign-default-permissions', assignDefaultPermissions);

// Get available permissions
router.get('/permissions', getAvailablePermissions);

// Get all roles
router.get('/roles', getAllRoles);

module.exports = router;
