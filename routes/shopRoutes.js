const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const {
  getMyShop,
  updateMyShop,
  getShop,
  listShops,
  deleteShop
} = require('../controllers/shopController');
const { auth, requireRole } = require('../middleware/auth');

// Current user shop endpoints (require authentication)
router.get('/my-shop', auth, getMyShop);
router.put('/my-shop', auth, upload.single('shop_logo'), updateMyShop);
router.delete('/my-shop', auth, deleteShop);

// Admin endpoints
router.get('/', requireRole('admin'), listShops);
router.get('/:userId', requireRole('admin'), getShop);

module.exports = router;
