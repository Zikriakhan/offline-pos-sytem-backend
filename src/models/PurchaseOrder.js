const mongoose = require('mongoose');

const itemSub = new mongoose.Schema({
  name: String,
  quantity: Number,
  price: Number,
  returnedQuantity: { type: Number, default: 0 },
  barcode: { type: String, default: '' } // Barcode for product identification
}, { _id: false });

const poSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  poNumber: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.Mixed }, // Mixed type to support both String (old) and ObjectId (new)
  supplierName: { type: String }, // Store supplier name for quick access
  date: { type: Date, default: Date.now },
  items: [itemSub],
  totalAmount: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  balanceAdjusted: { type: Boolean, default: false } // Track if supplier balance has been updated for this PO
}, { timestamps: true });

// Compound unique index: poNumber must be unique per owner (multi-user support)
poSchema.index({ owner: 1, poNumber: 1 }, { unique: true });

// Normalize JSON output to surface `id` while hiding `_id` and `__v`.
poSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('PurchaseOrder', poSchema);
