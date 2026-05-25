const mongoose = require('mongoose');
const { Schema } = mongoose;

const ShopSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  shop_code: { type: String, required: true, unique: true, index: true },
  shop_name: { type: String },
  shop_email: { type: String },
  phone_number: { type: String },
  website_link: { type: String },
  shop_logo: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.Shop || mongoose.model('Shop', ShopSchema);
