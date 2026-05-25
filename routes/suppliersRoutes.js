const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/suppliersController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.get('/:id/transactions', ctrl.listTransactions);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Outstanding balance management endpoints
router.post('/:id/payment', ctrl.recordPayment); // Record payment against outstanding balance
router.post('/:id/return', ctrl.recordReturn);   // Record return/credit to outstanding balance
router.patch('/:id/balance', ctrl.adjustBalance); // Adjust balance directly

module.exports = router;
