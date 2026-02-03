const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  contact: { type: String },
  totalSupplied: { type: Number, default: 0 },
  amountPayable: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 }, // Tracks unpaid amounts from purchases
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
