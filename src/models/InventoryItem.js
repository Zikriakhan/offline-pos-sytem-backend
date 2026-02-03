const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String },
  description: { type: String },
  // Barcode/SKU fields for POS scanning
  barcode: { type: String, sparse: true }, // Unique barcode for the product
  sku: { type: String, sparse: true }, // Stock Keeping Unit
  alternateBarcodes: [{ type: String }], // Alternative barcodes/codes for the product
  currentStock: { type: Number, required: true, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 0, min: 0 },
  unitOfMeasure: { type: String, enum: ['piece', 'kg', 'liter', 'meter', 'box', 'pack', 'other'], default: 'piece' },
  purchasePrice: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  
  // Comprehensive Inventory Tracking
  // Purchases
  totalPurchased: { type: Number, default: 0, min: 0 }, // Total items purchased
  totalPurchaseReturns: { type: Number, default: 0, min: 0 }, // Items returned to supplier
  
  // Sales statistics
  totalQuantitySold: { type: Number, default: 0, min: 0 }, // Total items sold
  totalSalesReturns: { type: Number, default: 0, min: 0 }, // Items returned by customers
  totalTransactions: { type: Number, default: 0, min: 0 },
  totalRevenue: { type: Number, default: 0, min: 0 },
  
  // Stock Adjustments (manual adjustments, damage, theft, etc.)
  totalAdjustments: { type: Number, default: 0 }, // Can be positive or negative
  
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

// Virtual field to calculate theoretical stock
itemSchema.virtual('calculatedStock').get(function() {
  // Formula: Initial + Purchases - Purchase Returns - Sales + Sales Returns + Adjustments
  return this.totalPurchased - this.totalPurchaseReturns - this.totalQuantitySold + this.totalSalesReturns + this.totalAdjustments;
});

// Index for efficient querying
itemSchema.index({ owner: 1, name: 1 });
itemSchema.index({ owner: 1, status: 1 });
// Barcode indexes for POS scanning
itemSchema.index({ owner: 1, barcode: 1 }, { sparse: true });
itemSchema.index({ owner: 1, sku: 1 }, { sparse: true });
itemSchema.index({ owner: 1, alternateBarcodes: 1 }, { sparse: true });

// Method to log stock transaction
itemSchema.methods.logTransaction = function(type, quantity, note = '') {
  console.log(`📦 Stock Transaction [${this.name}]:`);
  console.log(`   Type: ${type}`);
  console.log(`   Quantity: ${quantity}`);
  console.log(`   Before: ${this.currentStock}`);
  console.log(`   After: ${this.currentStock}`);
  if (note) console.log(`   Note: ${note}`);
  console.log(`   Purchased: ${this.totalPurchased} | Sold: ${this.totalQuantitySold} | Returns: ${this.totalSalesReturns}`);
};

module.exports = mongoose.model('InventoryItem', itemSchema);
