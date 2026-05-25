const mongoose = require('mongoose');
const { Schema } = mongoose;

const InventoryItemSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  name: { type: String, required: true },
  category: { type: String, default: 'General' },
  sku: { type: String, default: null },
  barcode: { type: String, default: null },
  // currentStock is authoritative. Keep quantity for backward compatibility.
  currentStock: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  totalPurchased: { type: Number, default: 0 },
  totalPurchaseReturns: { type: Number, default: 0 },
  totalQuantitySold: { type: Number, default: 0 },
  totalSalesReturns: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalTransactions: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 },
  unitOfMeasure: { type: String, default: 'piece' },
  status: { type: String, enum: ['active','inactive'], default: 'active' }
}, { timestamps: true });

// Keep `quantity` in sync with `currentStock` on save for compatibility with older code
InventoryItemSchema.pre('save', function (next) {
  if (this.currentStock !== undefined) {
    this.quantity = this.currentStock;
  }
  next();
});

module.exports = mongoose.models.InventoryItem || mongoose.model('InventoryItem', InventoryItemSchema);
