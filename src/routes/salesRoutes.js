const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesController');
const { auth } = require('../middleware/auth');

router.use(auth);

// Basic CRUD operations
router.get('/', ctrl.list);
router.get('/metrics/dashboard', ctrl.getSalesMetrics);
router.get('/items/stats/all', ctrl.getAllItemsSalesStats);
router.get('/items/:itemId/stats', ctrl.getItemSalesStats);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
