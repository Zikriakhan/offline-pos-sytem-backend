const mongoose = require('mongoose');
const { Schema } = mongoose;

const ExpenseSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  amount: { type: Number, required: true },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
