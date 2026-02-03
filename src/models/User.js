const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true }, // Email is primary key (unique index)
  password: { type: String, required: true }, // Only hashed password, plainPassword removed
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

// Ensure email uniqueness at schema level
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
