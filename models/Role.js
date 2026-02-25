const mongoose = require('mongoose');
const { Schema } = mongoose;

const RoleSchema = new Schema({
  role_name: { type: String, required: true, unique: true },
  description: { type: String },
  permissions: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.models.Role || mongoose.model('Role', RoleSchema);
