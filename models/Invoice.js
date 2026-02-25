const mongoose = require('mongoose');
const { Schema } = mongoose;

const InvoiceSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invoice_number: { type: String, required: true, unique: true },
  customer_name: { type: String },
  payment_method: { type: String },
  payment_status: { type: String },
  total_amount: { type: Number, default: 0 },
  meta: { type: Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
