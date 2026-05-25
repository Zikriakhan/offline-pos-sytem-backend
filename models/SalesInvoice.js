const mongoose = require('mongoose');
const { Schema } = mongoose;

const InvoiceItemSchema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
  name: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  returnedQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  itemTotal: { type: Number, default: 0 }
}, { _id: false });

const SalesInvoiceSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, default: '' },
  invoiceNumber: { type: String, index: true },
  invoiceDate: { type: Date, default: Date.now },
  items: { type: [InvoiceItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxPercentage: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  received: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'cash' },
  notes: { type: String, default: '' },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.models.SalesInvoice || mongoose.model('SalesInvoice', SalesInvoiceSchema);
