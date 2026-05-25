const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: { type: String },
  full_name: { type: String },
  username: { type: String, unique: false },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, default: 'user' },
  permissions: { type: [String], default: [] }, // per-user overrides
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'active' },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
