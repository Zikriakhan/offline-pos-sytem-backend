const mongoose = require('mongoose');

// Return Item Schema - tracks individual items being returned
const returnItemSchema = new mongoose.Schema({
  saleItemId: { type: mongoose.Schema.Types.ObjectId }, // Reference to original sale item
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  itemName: { type: String, required: true },
  quantityReturned: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  itemTotal: { type: Number, required: true, min: 0 }, // quantityReturned * unitPrice
  returnReason: { 
    type: String, 
    enum: ['defective', 'wrong_item', 'not_needed', 'damaged', 'expired', 'customer_request', 'other'],
    required: true 
  },
  notes: { type: String } // Additional notes about this specific item
}, { _id: true });

// Sales Return Transaction Schema
const salesReturnSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  returnNumber: { type: String, required: true },
  
  // Original Sale Reference
  originalSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice', required: true },
  originalInvoiceNumber: { type: String, required: true },
  
  // Customer Information
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  
  // Return Transaction Details
  returnDate: { type: Date, default: Date.now },
  returnItems: { type: [returnItemSchema], required: true, min: 1 },
  
  // Financial Information
  subtotalReturn: { type: Number, required: true, min: 0 }, // sum of all return item totals
  taxReturn: { type: Number, default: 0, min: 0 }, // tax to be refunded
  totalReturnAmount: { type: Number, required: true, min: 0 }, // total amount to refund
  
  // Refund Processing
  refundMethod: { 
    type: String, 
    enum: ['cash', 'credit', 'original_payment', 'store_credit', 'bank_transfer', 'card'],
    default: 'original_payment'
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'approved', 'processed', 'completed', 'rejected'],
    default: 'pending'
  },
  refundProcessedDate: { type: Date },
  
  // Transaction Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'completed', 'cancelled'],
    default: 'submitted'
  },
  
  // Inventory Update
  inventoryUpdated: { type: Boolean, default: false },
  inventoryUpdateDate: { type: Date },
  
  // Additional Information
  returnReason: { type: String }, // Overall return reason
  notes: { type: String }, // General notes about the return transaction
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff who processed the return
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Manager/admin who approved
}, { timestamps: true });

// Indexes for efficient querying
salesReturnSchema.index({ owner: 1, returnDate: -1 });
salesReturnSchema.index({ originalSaleId: 1 });
salesReturnSchema.index({ customer: 1 });
salesReturnSchema.index({ returnNumber: 1, owner: 1 }, { unique: true }); // Unique per owner
salesReturnSchema.index({ status: 1 });
salesReturnSchema.index({ refundStatus: 1 });

// Pre-save middleware to generate return number if not provided
salesReturnSchema.pre('save', async function(next) {
  try {
    if (!this.returnNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Find the last return number for this owner
      const lastReturn = await this.constructor
        .findOne({ owner: this.owner })
        .sort({ createdAt: -1 })
        .select('returnNumber');
      
      let sequence = 1;
      if (lastReturn && lastReturn.returnNumber) {
        try {
          const lastSequence = parseInt(lastReturn.returnNumber.split('-').pop());
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        } catch (e) {
          console.log('Could not parse last return number, using sequence 1');
          sequence = 1;
        }
      }
      
      this.returnNumber = `RET-${year}${month}-${String(sequence).padStart(4, '0')}`;
      console.log('Generated returnNumber:', this.returnNumber);
    }
    next();
  } catch (error) {
    console.error('Error in returnNumber pre-save hook:', error);
    // Generate a fallback return number if there's an error
    const date = new Date();
    const timestamp = Date.now();
    this.returnNumber = `RET-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${timestamp.toString().slice(-4)}`;
    console.log('Using fallback returnNumber:', this.returnNumber);
    next();
  }
});

// Virtual for checking if return is eligible for approval
salesReturnSchema.virtual('isEligibleForApproval').get(function() {
  return this.status === 'submitted' && this.refundStatus === 'pending';
});

// Method to calculate return totals
salesReturnSchema.methods.calculateTotals = function() {
  this.subtotalReturn = this.returnItems.reduce((sum, item) => sum + item.itemTotal, 0);
  this.totalReturnAmount = this.subtotalReturn + this.taxReturn;
  return this;
};

module.exports = mongoose.model('SalesReturn', salesReturnSchema);
