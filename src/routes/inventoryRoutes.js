const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const { auth } = require('../middleware/auth');

router.use(auth);

// Basic CRUD operations
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/bulk-adjust', ctrl.bulkAdjustStock);
router.get('/analytics/stats', ctrl.getInventoryStats);
router.get('/alerts/low-stock', ctrl.getLowStockAlerts);
// Barcode search routes
router.get('/search/barcode/:barcode', ctrl.searchByBarcode);
router.post('/search/barcodes', ctrl.searchByMultipleBarcodes);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.post('/:id/adjust-stock', ctrl.adjustStock);
router.delete('/:id', ctrl.remove);

module.exports = router;
