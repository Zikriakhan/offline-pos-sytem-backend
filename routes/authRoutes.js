const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const {
	signup,
	login,
	list,
	get,
	update,
	remove,
	adminList,
	resetPassword,
	forgotPassword,
	updatePassword,
	toggleUserStatus,
	migrateUserStatus,
	removeUserWithData,
	getMe,
	updateMe
} = require('../controllers/authController');
const { auth, requireRole, requirePermission } = require('../middleware/auth');

// Public
router.post('/signup', upload.single('shop_logo'), signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/update-password', updatePassword);

// Current user endpoints (require authentication)
router.get('/me', auth, getMe);
router.put('/me', auth, upload.single('shop_logo'), updateMe);

// Protected (admin/user-management for some routes)
router.use(auth);
router.get('/', requirePermission('User Management'), list);
router.get('/users', requirePermission('User Management'), adminList);
router.post('/users', requirePermission('User Management'), signup);
router.get('/users/:id', requirePermission('User Management'), get);
router.post('/migrate-status', requirePermission('User Management'), migrateUserStatus);

router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', remove);

// Admin update/delete under /users path
router.put('/users/:id', requireRole('admin'), update);
router.patch('/users/:id/toggle-status', requireRole('admin'), toggleUserStatus);

// Admin: delete user and all owned data
router.delete('/users/:id/full-delete', requireRole('admin'), removeUserWithData);

router.delete('/users/:id', requireRole('admin'), remove);

module.exports = router;
