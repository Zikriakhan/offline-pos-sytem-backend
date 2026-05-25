const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customersController');
const { auth } = require('../middleware/auth');

// protect all customer routes
router.use(auth);
router.get('/', ctrl.list);
router.get('/transactions/summary', ctrl.listTransactionSummary);
router.get('/:id/transactions', ctrl.listTransactions);
router.post('/:id/payment', ctrl.recordPayment);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
