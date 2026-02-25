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
const { auth, requireRole } = require('../middleware/auth');

// Public
router.post('/signup', upload.single('shop_logo'), signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/update-password', updatePassword);

// Current user endpoints (require authentication)
router.get('/me', auth, getMe);
router.put('/me', auth, upload.single('shop_logo'), updateMe);

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

// Admin: delete user and all owned data
router.delete('/users/:id/full-delete', requireRole('admin'), removeUserWithData);

router.delete('/users/:id', remove);

module.exports = router;
