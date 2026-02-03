const express = require('express');
const router = express.Router();
const { signup, login, list, get, update, remove, adminList, resetPassword, toggleUserStatus, migrateUserStatus } = require('../controllers/authController');
const { auth, requireRole } = require('../middleware/auth');

// Public
router.post('/signup', signup);
router.post('/login', login);
router.post('/reset-password', resetPassword);

// Protected (admin-only for some routes)
router.use(auth);
router.get('/', list);
router.get('/users', requireRole('admin'), adminList);
router.post('/users', requireRole('admin'), signup);
router.get('/users/:id', requireRole('admin'), adminList);
router.post('/migrate-status', requireRole('admin'), migrateUserStatus);

router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', remove);

// Admin update/delete under /users path
router.put('/users/:id', update);
router.patch('/users/:id/toggle-status', requireRole('admin'), toggleUserStatus);

router.delete('/users/:id', remove);

module.exports = router;
