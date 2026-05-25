const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerSchema = new Schema({
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  name: { type: String, required: true },
  phone: { type: String },
  contact: { type: String },
  email: { type: String },
  totalPurchases: { type: Number, default: 0 },
  outstanding: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 }, // Credit earned from over-returns or adjustments
  status: { type: String, default: 'active' },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
