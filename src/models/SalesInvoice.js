const mongoose = require('mongoose');

const saleItem = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  returnedQuantity: { type: Number, default: 0, min: 0 }, // for sales returns
  unitPrice: { type: Number, required: true, min: 0 },
  itemTotal: { type: Number, required: true, min: 0 } // (quantity - returnedQuantity) * unitPrice
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceNumber: { type: String, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // optional - for registered customers
  customerName: { type: String }, // optional - for walk-in customers without ID
  invoiceDate: { type: Date, default: Date.now },
  items: { type: [saleItem], required: true, min: 1 },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'credit', 'cheque', 'bank_transfer', 'card', 'online', 'other'], 
    default: 'cash' 
  },
  subtotal: { type: Number, required: true, min: 0 }, // sum of all itemTotal
  discount: { type: Number, default: 0, min: 0 }, // discount amount
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  tax: { type: Number, default: 0, min: 0 }, // tax/VAT amount
  taxPercentage: { type: Number, default: 0, min: 0, max: 100 },
  grandTotal: { type: Number, required: true, min: 0 }, // subtotal - discount + tax
  received: { type: Number, default: 0, min: 0 }, // amount paid
  balance: { type: Number, default: 0 }, // grandTotal - received
  notes: { type: String },
  status: { type: String, enum: ['draft', 'pending', 'partial', 'paid', 'cancelled'], default: 'pending' }
}, { timestamps: true });

// Index for efficient querying
invoiceSchema.index({ owner: 1, invoiceDate: -1 });
invoiceSchema.index({ customer: 1 });
// Compound unique index: invoiceNumber must be unique per owner (multi-user support)
invoiceSchema.index({ owner: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model('SalesInvoice', invoiceSchema);
