const SalesReturn = require('../models/SalesReturn');
const SalesInvoice = require('../models/SalesInvoice');
const InventoryItem = require('../models/InventoryItem');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

/**
 * Create a new sales return transaction
 * POST /api/sales-returns
 */
exports.createSalesReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      originalSaleId,
      returnItems,
      returnReason,
      refundMethod,
      notes
    } = req.body;

    console.log('📦 Create Sales Return Request:', {
      userId,
      originalSaleId,
      returnItemsCount: returnItems?.length,
      returnReason,
      refundMethod
    });

    // Validate required fields
    if (!originalSaleId || !returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      console.error('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Original sale ID and return items are required',
        details: {
          originalSaleId: !!originalSaleId,
          returnItems: Array.isArray(returnItems) ? returnItems.length : 'not an array'
        }
      });
    }

    // Validate originalSaleId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(originalSaleId)) {
      console.error('❌ Invalid originalSaleId format:', originalSaleId);
      return res.status(400).json({
        success: false,
        message: 'Invalid sale ID format'
      });
    }

    // Fetch the original sale invoice
    console.log('🔍 Fetching original sale invoice:', originalSaleId);
    const originalSale = await SalesInvoice.findOne({
      _id: originalSaleId,
      owner: userId
    }).populate('customer');

    if (!originalSale) {
      console.error('❌ Original sale invoice not found:', originalSaleId);
      return res.status(404).json({
        success: false,
        message: 'Original sale invoice not found'
      });
    }

    console.log('✅ Original sale found:', {
      invoiceNumber: originalSale.invoiceNumber,
      customerName: originalSale.customerName,
      itemsCount: originalSale.items?.length
    });

    // Validate return items against original sale
    const validatedReturnItems = [];
    let subtotalReturn = 0;

    console.log('🔍 Validating return items...');
    for (const returnItem of returnItems) {
      const { itemId, itemName, quantityReturned, returnReason: itemReturnReason, notes: itemNotes } = returnItem;

      console.log('Processing return item:', { itemId, itemName, quantityReturned });

      // Validate itemId
      if (!itemId) {
        console.error('❌ Missing itemId in return item:', returnItem);
        return res.status(400).json({
          success: false,
          message: 'Each return item must have an itemId'
        });
      }

      // Validate quantityReturned
      const qty = parseFloat(quantityReturned);
      if (isNaN(qty) || qty <= 0) {
        console.error('❌ Invalid quantityReturned:', quantityReturned);
        return res.status(400).json({
          success: false,
          message: `Invalid quantity returned for item: ${itemName || itemId}`
        });
      }

      // Find the corresponding item in the original sale
      const originalItem = originalSale.items.find(
        item => item.itemId && item.itemId.toString() === itemId.toString()
      );

      if (!originalItem) {
        console.error('❌ Item not found in original sale:', itemId);
        return res.status(400).json({
          success: false,
          message: `Item ${itemName || itemId} not found in original sale`
        });
      }

      // Check if return quantity exceeds available quantity
      const availableForReturn = originalItem.quantity - (originalItem.returnedQuantity || 0);
      if (qty > availableForReturn) {
        console.error('❌ Return quantity exceeds available:', { qty, availableForReturn });
        return res.status(400).json({
          success: false,
          message: `Return quantity (${qty}) exceeds available quantity (${availableForReturn}) for item ${originalItem.name}`
        });
      }

      // Calculate item total for return
      const itemTotal = qty * originalItem.unitPrice;
      subtotalReturn += itemTotal;

      validatedReturnItems.push({
        saleItemId: originalItem._id,
        itemId: originalItem.itemId,
        name: originalItem.name,
        itemName: originalItem.name,
        quantity: qty,
        quantityReturned: qty,
        unitPrice: originalItem.unitPrice,
        itemTotal,
        reason: itemReturnReason || returnReason || 'customer_request',
        returnReason: itemReturnReason || returnReason || 'customer_request',
        notes: itemNotes
      });

      console.log('✅ Item validated:', { itemName: originalItem.name, qty, itemTotal });
    }

    console.log('✅ All items validated. Total return items:', validatedReturnItems.length);

    // Calculate tax return (proportional to original tax)
    const taxReturn = originalSale.tax 
      ? (subtotalReturn / originalSale.subtotal) * originalSale.tax 
      : 0;

    const totalReturnAmount = subtotalReturn + taxReturn;

    console.log('💰 Financial calculations:', {
      subtotalReturn: subtotalReturn.toFixed(2),
      taxReturn: taxReturn.toFixed(2),
      totalReturnAmount: totalReturnAmount.toFixed(2)
    });

    // Generate returnNumber with retry logic to handle duplicates
    let returnNumber = '';
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        // Find the last return number for this owner
        const lastReturn = await SalesReturn.findOne({ owner: userId })
          .sort({ createdAt: -1 })
          .select('returnNumber');
        
        let sequence = 1;
        if (lastReturn && lastReturn.returnNumber) {
          const lastSequence = parseInt(lastReturn.returnNumber.split('-').pop());
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        }
        
        // Add attempt number if retrying
        if (attempts > 0) {
          sequence += attempts;
        }
        
        returnNumber = `RET-${year}${month}-${String(sequence).padStart(4, '0')}`;
        
        // Check if this return number already exists for this owner
        const existingReturn = await SalesReturn.findOne({ 
          owner: userId, 
          returnNumber: returnNumber 
        });
        
        if (!existingReturn) {
          console.log('📋 Generated returnNumber:', returnNumber);
          break; // Success, exit loop
        }
        
        console.log(`⚠️ Return number ${returnNumber} already exists, retrying...`);
        attempts++;
        
      } catch (e) {
        console.warn('⚠️ Error generating returnNumber:', e.message);
        attempts++;
      }
    }
    
    // Final fallback if all attempts failed
    if (!returnNumber || attempts >= maxAttempts) {
      returnNumber = `RET-${Date.now().toString().slice(-8)}`;
      console.log('📋 Using timestamp fallback returnNumber:', returnNumber);
    }

    // Get customer information safely
    const customerName = originalSale.customerName || 
                        (originalSale.customer && originalSale.customer.name) || 
                        'Walk-in';
    const customerId = originalSale.customer?._id || null;

    console.log('👤 Customer info:', { customerId, customerName });

    // Create the sales return transaction
    const salesReturn = new SalesReturn({
      owner: userId,
      returnNumber: returnNumber, // Set explicitly to avoid validation errors
      originalSaleId: originalSale._id,
      originalInvoiceNumber: originalSale.invoiceNumber,
      customer: customerId,
      customerName: customerName,
      returnDate: new Date(),
      returnItems: validatedReturnItems,
      subtotalReturn,
      taxReturn,
      totalReturnAmount,
      refundMethod: refundMethod || 'original_payment',
      refundStatus: 'pending',
      status: 'submitted',
      returnReason,
      notes,
      processedBy: userId
    });

    console.log('💾 Saving sales return...');
    await salesReturn.save();
    console.log('✅ Sales return saved successfully:', salesReturn._id);

    // Update the original sale invoice with returned quantities
    console.log('📝 Updating original invoice with returned quantities...');
    for (const returnItem of validatedReturnItems) {
      const saleItem = originalSale.items.id(returnItem.saleItemId);
      if (saleItem) {
        saleItem.returnedQuantity = (saleItem.returnedQuantity || 0) + returnItem.quantity;
        
        // Recalculate item total based on remaining quantity
        const remainingQty = saleItem.quantity - saleItem.returnedQuantity;
        saleItem.itemTotal = remainingQty * saleItem.unitPrice;
        
        console.log('  ✅ Updated item:', {
          name: saleItem.name,
          returnedQty: returnItem.quantity,
          totalReturned: saleItem.returnedQuantity,
          remainingQty
        });
      }
    }

    // Recalculate invoice totals
    originalSale.subtotal = originalSale.items.reduce((sum, item) => sum + item.itemTotal, 0);
    originalSale.grandTotal = originalSale.subtotal - originalSale.discount + originalSale.tax;

    // Apply refund to original sale received amount (if any)
    const refundToApply = totalReturnAmount || 0;
    if (refundToApply > 0) {
      const prevReceived = originalSale.received || 0;
      originalSale.received = Math.max(0, prevReceived - refundToApply);
      // Update customer totals if applicable
      if (customerId) {
        try {
          await Customer.findByIdAndUpdate(customerId, {
            $inc: {
              totalPurchases: -refundToApply,
              outstanding: -refundToApply
            }
          });
        } catch (e) {
          console.warn('Could not update customer totals for refund:', e.message);
        }
      }
      // Mark refund processed on salesReturn
      salesReturn.refundStatus = 'processed';
      salesReturn.refundProcessedDate = new Date();
      salesReturn.status = 'completed';
    }

    // Recalculate balance and status
    originalSale.balance = originalSale.grandTotal - (originalSale.received || 0);
    if (originalSale.grandTotal === 0) {
      originalSale.status = 'cancelled';
    } else if ((originalSale.received || 0) >= originalSale.grandTotal) {
      originalSale.status = 'paid';
    } else if ((originalSale.received || 0) > 0) {
      originalSale.status = 'partial';
    }

    console.log('💾 Saving updated invoice...');
    await originalSale.save();
    // Save salesReturn updates (refund flags)
    await salesReturn.save();

    console.log('✅ Invoice updated successfully');
    console.log('🎉 Sales return process completed successfully!');
    res.status(201).json({
      success: true,
      message: 'Sales return created successfully',
      data: salesReturn
    });
  } catch (error) {
    console.error('❌ Error creating sales return:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create sales return',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get all sales returns for the authenticated user
 * GET /api/sales-returns
 */
exports.getAllSalesReturns = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, refundStatus, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Build filter query
    const filter = { owner: userId };

    if (status) {
      filter.status = status;
    }

    if (refundStatus) {
      filter.refundStatus = refundStatus;
    }

    if (startDate || endDate) {
      filter.returnDate = {};
      if (startDate) {
        filter.returnDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.returnDate.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch sales returns with pagination
    const salesReturns = await SalesReturn.find(filter)
      .populate('customer', 'name phone email')
      .populate('originalSaleId', 'invoiceNumber invoiceDate')
      .populate('processedBy', 'username email')
      .populate('approvedBy', 'username email')
      .sort({ returnDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalReturns = await SalesReturn.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: salesReturns.length,
      total: totalReturns,
      page: parseInt(page),
      totalPages: Math.ceil(totalReturns / parseInt(limit)),
      data: salesReturns
    });
  } catch (error) {
    console.error('Error fetching sales returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales returns',
      error: error.message
    });
  }
};

/**
 * Get a single sales return by ID
 * GET /api/sales-returns/:id
 */
exports.getSalesReturnById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const salesReturn = await SalesReturn.findOne({
      _id: id,
      owner: userId
    })
      .populate('customer', 'name phone email address')
      .populate('originalSaleId')
      .populate('returnItems.itemId', 'name category')
      .populate('processedBy', 'username email')
      .populate('approvedBy', 'username email');

    if (!salesReturn) {
      return res.status(404).json({
        success: false,
        message: 'Sales return not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salesReturn
    });
  } catch (error) {
    console.error('Error fetching sales return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales return',
      error: error.message
    });
  }
};

/**
 * Approve a sales return
 * PUT /api/sales-returns/:id/approve
 */
exports.approveSalesReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { updateInventory = true } = req.body;

    const salesReturn = await SalesReturn.findOne({
      _id: id,
      owner: userId
    });

    if (!salesReturn) {
      return res.status(404).json({
        success: false,
        message: 'Sales return not found'
      });
    }

    // Check if already approved
    if (salesReturn.status === 'approved' || salesReturn.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Sales return already approved'
      });
    }

    // Update return status
    salesReturn.status = 'approved';
    salesReturn.refundStatus = 'approved';
    salesReturn.approvedBy = userId;

    // Update inventory if requested
    if (updateInventory && !salesReturn.inventoryUpdated) {
      for (const returnItem of salesReturn.returnItems) {
        const inventoryItem = await InventoryItem.findOne({
          _id: returnItem.itemId,
          owner: userId
        });

        if (inventoryItem) {
          // Add returned quantity back to stock
          inventoryItem.currentStock += returnItem.quantity;
          
          // Update sales statistics
          inventoryItem.totalQuantitySold = Math.max(
            0, 
            inventoryItem.totalQuantitySold - returnItem.quantity
          );
          inventoryItem.totalRevenue = Math.max(
            0,
            inventoryItem.totalRevenue - returnItem.itemTotal
          );

          await inventoryItem.save();
        }
      }

      salesReturn.inventoryUpdated = true;
      salesReturn.inventoryUpdateDate = new Date();
    }

    await salesReturn.save();

    res.status(200).json({
      success: true,
      message: 'Sales return approved successfully',
      data: salesReturn
    });
  } catch (error) {
    console.error('Error approving sales return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve sales return',
      error: error.message
    });
  }
};

/**
 * Process refund for an approved sales return
 * PUT /api/sales-returns/:id/process-refund
 */
exports.processRefund = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { refundMethod, notes } = req.body;

    const salesReturn = await SalesReturn.findOne({
      _id: id,
      owner: userId
    });

    if (!salesReturn) {
      return res.status(404).json({
        success: false,
        message: 'Sales return not found'
      });
    }

    // Check if approved
    if (salesReturn.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Sales return must be approved before processing refund'
      });
    }

    // Check if already processed
    if (salesReturn.refundStatus === 'processed' || salesReturn.refundStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Refund already processed'
      });
    }

    // Update refund details
    salesReturn.refundStatus = 'processed';
    salesReturn.refundProcessedDate = new Date();
    salesReturn.status = 'completed';

    if (refundMethod) {
      salesReturn.refundMethod = refundMethod;
    }

    if (notes) {
      salesReturn.notes = salesReturn.notes 
        ? `${salesReturn.notes}\nRefund Notes: ${notes}` 
        : notes;
    }

    await salesReturn.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: salesReturn
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

/**
 * Update a sales return
 * PUT /api/sales-returns/:id
 */
exports.updateSalesReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const salesReturn = await SalesReturn.findOne({
      _id: id,
      owner: userId
    });

    if (!salesReturn) {
      return res.status(404).json({
        success: false,
        message: 'Sales return not found'
      });
    }

    // Prevent updating completed or cancelled returns
    if (salesReturn.status === 'completed' || salesReturn.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed or cancelled returns'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['notes', 'returnReason', 'refundMethod', 'status'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        salesReturn[field] = updates[field];
      }
    });

    await salesReturn.save();

    res.status(200).json({
      success: true,
      message: 'Sales return updated successfully',
      data: salesReturn
    });
  } catch (error) {
    console.error('Error updating sales return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sales return',
      error: error.message
    });
  }
};

/**
 * Delete/Cancel a sales return
 * DELETE /api/sales-returns/:id
 */
exports.deleteSalesReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const salesReturn = await SalesReturn.findOne({
      _id: id,
      owner: userId
    });

    if (!salesReturn) {
      return res.status(404).json({
        success: false,
        message: 'Sales return not found'
      });
    }

    // If return was approved and inventory was updated, revert inventory changes
    if (salesReturn.inventoryUpdated) {
      for (const returnItem of salesReturn.returnItems) {
        const inventoryItem = await InventoryItem.findOne({
          _id: returnItem.itemId,
          owner: userId
        });

        if (inventoryItem) {
          // Remove returned quantity from stock
          inventoryItem.currentStock = Math.max(
            0,
            inventoryItem.currentStock - returnItem.quantity
          );
          
          // Restore sales statistics
          inventoryItem.totalQuantitySold += returnItem.quantity;
          inventoryItem.totalRevenue += returnItem.itemTotal;

          await inventoryItem.save();
        }
      }

      // Restore original sale quantities
      const originalSale = await SalesInvoice.findById(salesReturn.originalSaleId);
      if (originalSale) {
        for (const returnItem of salesReturn.returnItems) {
          const saleItem = originalSale.items.id(returnItem.saleItemId);
          if (saleItem) {
            saleItem.returnedQuantity = Math.max(
              0,
              (saleItem.returnedQuantity || 0) - returnItem.quantity
            );
            
            // Recalculate item total
            const remainingQty = saleItem.quantity - saleItem.returnedQuantity;
            saleItem.itemTotal = remainingQty * saleItem.unitPrice;
          }
        }

        // Recalculate invoice totals
        originalSale.subtotal = originalSale.items.reduce((sum, item) => sum + item.itemTotal, 0);
        originalSale.grandTotal = originalSale.subtotal - originalSale.discount + originalSale.tax;
        originalSale.balance = originalSale.grandTotal - originalSale.received;

        await originalSale.save();
      }
    }

    // Mark as cancelled instead of deleting
    salesReturn.status = 'cancelled';
    salesReturn.refundStatus = 'rejected';
    await salesReturn.save();

    res.status(200).json({
      success: true,
      message: 'Sales return cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling sales return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel sales return',
      error: error.message
    });
  }
};

/**
 * Get sales return statistics
 * GET /api/sales-returns/stats
 */
exports.getSalesReturnStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build filter
    const filter = { owner: userId };
    if (startDate || endDate) {
      filter.returnDate = {};
      if (startDate) filter.returnDate.$gte = new Date(startDate);
      if (endDate) filter.returnDate.$lte = new Date(endDate);
    }

    // Aggregate statistics
    const stats = await SalesReturn.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalReturns: { $sum: 1 },
          totalReturnAmount: { $sum: '$totalReturnAmount' },
          pendingReturns: {
            $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
          },
          approvedReturns: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          completedReturns: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledReturns: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          pendingRefunds: {
            $sum: { $cond: [{ $eq: ['$refundStatus', 'pending'] }, '$totalReturnAmount', 0] }
          },
          processedRefunds: {
            $sum: { $cond: [{ $eq: ['$refundStatus', 'processed'] }, '$totalReturnAmount', 0] }
          }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalReturns: 0,
      totalReturnAmount: 0,
      pendingReturns: 0,
      approvedReturns: 0,
      completedReturns: 0,
      cancelledReturns: 0,
      pendingRefunds: 0,
      processedRefunds: 0
    };

    delete result._id;

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching sales return stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
