const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  contact: { type: String },
  email: { type: String },
  totalPurchases: { type: Number, default: 0 },
  outstanding: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
