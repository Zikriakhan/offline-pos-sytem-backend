const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String },
  date: { type: Date, default: Date.now },
  amount: { type: Number, default: 0 },
  paymentMethod: { type: String },
  type: { type: String, enum: ['one-time', 'Monthly'], default: 'one-time' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
