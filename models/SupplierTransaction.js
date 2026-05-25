const mongoose = require('mongoose');
const { Schema } = mongoose;

const SupplierTransactionSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  type: {
    type: String,
    enum: ['payment', 'return', 'adjustment'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  note: { type: String, default: '' },
  transactionDate: { type: Date, default: Date.now },
  referenceNumber: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.SupplierTransaction || mongoose.model('SupplierTransaction', SupplierTransactionSchema);
