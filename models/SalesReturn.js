const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReturnItemSchema = new Schema({
  saleItemId: { type: Schema.Types.ObjectId, default: null },
  itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
  name: { type: String, default: '' },
  itemName: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  quantityReturned: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  itemTotal: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  returnReason: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: false });

const SalesReturnSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  originalSaleId: { type: Schema.Types.ObjectId, ref: 'SalesInvoice' },
  originalInvoiceNumber: { type: String, default: '' },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, default: 'Walk-in' },
  returnNumber: { type: String, index: true },
  returnDate: { type: Date, default: Date.now },
  returnItems: { type: [ReturnItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  subtotalReturn: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxReturn: { type: Number, default: 0 },
  totalReturnAmount: { type: Number, default: 0 },
  originalPurchaseAmount: { type: Number, default: 0 },
  originalOutstandingAmount: { type: Number, default: 0 },
  adjustedOutstandingAmount: { type: Number, default: 0 },
  outstandingAdjustmentAmount: { type: Number, default: 0 },
  cashRefundAmount: { type: Number, default: 0 },
  creditAmount: { type: Number, default: 0 }, // Credit issued when return exceeds outstanding
  adjustmentMode: { type: String, default: 'adjust_outstanding' },
  refundMethod: { type: String, default: 'original_payment' },
  refundStatus: { type: String, default: 'pending' },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  inventoryUpdated: { type: Boolean, default: false },
  inventoryUpdateDate: { type: Date },
  notes: { type: String, default: '' },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.models.SalesReturn || mongoose.model('SalesReturn', SalesReturnSchema);
