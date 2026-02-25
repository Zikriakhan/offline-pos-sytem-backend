const express = require('express');
const router = express.Router();
const salesReturnsController = require('../controllers/salesReturnsController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

/**
 * @route   POST /api/sales-returns
 * @desc    Create a new sales return transaction
 * @access  Private
 */
router.post('/', salesReturnsController.createSalesReturn);

/**
 * @route   GET /api/sales-returns
 * @desc    Get all sales returns for the authenticated user
 * @access  Private
 * @query   status, refundStatus, startDate, endDate, page, limit
 */
router.get('/', salesReturnsController.getAllSalesReturns);

/**
 * @route   GET /api/sales-returns/stats
 * @desc    Get sales return statistics
 * @access  Private
 * @query   startDate, endDate
 */
router.get('/stats', salesReturnsController.getSalesReturnStats);

/**
 * @route   GET /api/sales-returns/:id
 * @desc    Get a single sales return by ID
 * @access  Private
 */
router.get('/:id', salesReturnsController.getSalesReturnById);

/**
 * @route   PUT /api/sales-returns/:id
 * @desc    Update a sales return
 * @access  Private
 */
router.put('/:id', salesReturnsController.updateSalesReturn);

/**
 * @route   PUT /api/sales-returns/:id/approve
 * @desc    Approve a sales return and optionally update inventory
 * @access  Private
 */
router.put('/:id/approve', salesReturnsController.approveSalesReturn);

/**
 * @route   PUT /api/sales-returns/:id/process-refund
 * @desc    Process refund for an approved sales return
 * @access  Private
 */
router.put('/:id/process-refund', salesReturnsController.processRefund);

/**
 * @route   DELETE /api/sales-returns/:id
 * @desc    Cancel a sales return (soft delete)
 * @access  Private
 */
router.delete('/:id', salesReturnsController.deleteSalesReturn);

module.exports = router;
