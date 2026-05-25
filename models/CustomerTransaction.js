const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerTransactionSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  type: {
    type: String,
    enum: ['payment', 'payout', 'sales_return_adjustment', 'sales_return_credit'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  paidBy: { type: String, default: '' },
  note: { type: String, default: '' },
  transactionDate: { type: Date, default: Date.now },
  referenceNumber: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.CustomerTransaction || mongoose.model('CustomerTransaction', CustomerTransactionSchema);
