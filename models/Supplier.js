const mongoose = require('mongoose');
const { Schema } = mongoose;

const SupplierSchema = new Schema({
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  name: { type: String, required: true },
  phone: { type: String },
  contact: { type: String },
  email: { type: String },
  totalSupplied: { type: Number, default: 0 },
  amountPayable: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
