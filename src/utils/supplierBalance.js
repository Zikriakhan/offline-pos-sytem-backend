const Supplier = require('../models/Supplier');

/**
 * Calculate outstanding balance for a purchase order
 * Outstanding = Total Amount - Paid Amount
 */
function calculateOutstanding(totalAmount, paid) {
  return Math.max(0, totalAmount - (paid || 0));
}

/**
 * Update supplier's outstanding balance when PO is created/completed
 */
async function updateSupplierBalance(supplierId, amount, operation = 'add') {
  if (!supplierId) return;

  try {
    if (operation === 'add') {
      // Add to outstanding balance
      await Supplier.findByIdAndUpdate(
        supplierId,
        { $inc: { outstandingBalance: amount } },
        { new: true }
      );
    } else if (operation === 'subtract') {
      // Subtract from outstanding balance (payment made)
      await Supplier.findByIdAndUpdate(
        supplierId,
        { $inc: { outstandingBalance: -amount } },
        { new: true }
      );
    } else if (operation === 'set') {
      // Set exact outstanding balance
      await Supplier.findByIdAndUpdate(
        supplierId,
        { outstandingBalance: amount },
        { new: true }
      );
    }
  } catch (error) {
    console.error('Error updating supplier balance:', error);
    // Don't throw - balance update should not block PO creation
  }
}

/**
 * Process supplier balance when PO is completed
 */
async function processSupplierBalanceOnCompletion(po) {
  if (!po.supplier || po.status !== 'completed') return;

  const outstandingAmount = calculateOutstanding(po.totalAmount, po.paid);
  
  if (outstandingAmount > 0) {
    await updateSupplierBalance(po.supplier, outstandingAmount, 'add');
  }
}

/**
 * Adjust supplier balance when PO is updated
 */
async function adjustSupplierBalance(oldPO, newPO) {
  // If supplier changed, handle both old and new supplier
  if (oldPO.supplier !== newPO.supplier) {
    // Remove old supplier's balance
    if (oldPO.supplier && oldPO.status === 'completed') {
      const oldOutstanding = calculateOutstanding(oldPO.totalAmount, oldPO.paid);
      if (oldOutstanding > 0) {
        await updateSupplierBalance(oldPO.supplier, oldOutstanding, 'subtract');
      }
    }
    
    // Add to new supplier's balance
    if (newPO.supplier && newPO.status === 'completed') {
      const newOutstanding = calculateOutstanding(newPO.totalAmount, newPO.paid);
      if (newOutstanding > 0) {
        await updateSupplierBalance(newPO.supplier, newOutstanding, 'add');
      }
    }
    return;
  }

  // Same supplier - adjust if amount or payment changed
  if (newPO.status === 'completed' && oldPO.status === 'completed') {
    const oldOutstanding = calculateOutstanding(oldPO.totalAmount, oldPO.paid);
    const newOutstanding = calculateOutstanding(newPO.totalAmount, newPO.paid);
    
    const difference = newOutstanding - oldOutstanding;
    
    if (difference !== 0) {
      if (difference > 0) {
        await updateSupplierBalance(newPO.supplier, difference, 'add');
      } else {
        await updateSupplierBalance(newPO.supplier, Math.abs(difference), 'subtract');
      }
    }
  }
  
  // If status changed from pending to completed
  if (oldPO.status !== 'completed' && newPO.status === 'completed') {
    const outstandingAmount = calculateOutstanding(newPO.totalAmount, newPO.paid);
    if (outstandingAmount > 0) {
      await updateSupplierBalance(newPO.supplier, outstandingAmount, 'add');
    }
  }

  // If status changed from completed to cancelled/pending
  if (oldPO.status === 'completed' && (newPO.status === 'cancelled' || newPO.status === 'pending')) {
    const outstandingAmount = calculateOutstanding(oldPO.totalAmount, oldPO.paid);
    if (outstandingAmount > 0) {
      await updateSupplierBalance(oldPO.supplier, outstandingAmount, 'subtract');
    }
  }
}

/**
 * Reverse supplier balance when PO is deleted
 */
async function reverseSupplierBalance(po) {
  if (!po.supplier || po.status !== 'completed') return;

  const outstandingAmount = calculateOutstanding(po.totalAmount, po.paid);
  if (outstandingAmount > 0) {
    await updateSupplierBalance(po.supplier, outstandingAmount, 'subtract');
  }
}

/**
 * Handle supplier payment - reduces outstanding balance
 */
async function processSupplierPayment(supplierId, paymentAmount) {
  if (!supplierId || paymentAmount <= 0) return;

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new Error('Supplier not found');

  const newBalance = Math.max(0, supplier.outstandingBalance - paymentAmount);
  await updateSupplierBalance(supplierId, newBalance, 'set');

  return supplier;
}

/**
 * Adjust balance when items are returned
 */
async function processSupplierReturn(supplierId, returnAmount) {
  if (!supplierId || returnAmount <= 0) return;

  // When items are returned, add back to outstanding balance
  // (the supplier receives credit/refund)
  await updateSupplierBalance(supplierId, returnAmount, 'add');
}

module.exports = {
  calculateOutstanding,
  updateSupplierBalance,
  processSupplierBalanceOnCompletion,
  adjustSupplierBalance,
  reverseSupplierBalance,
  processSupplierPayment,
  processSupplierReturn
};
