const mongoose = require('mongoose');
const { Schema } = mongoose;

const PurchaseOrderItemSchema = new Schema({
  name: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  returnedQuantity: { type: Number, default: 0 },
  barcode: { type: String, default: null }
}, { _id: false });

const PurchaseOrderSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, default: '' },
  poNumber: { type: String, index: true },
  date: { type: Date, default: Date.now },
  items: { type: [PurchaseOrderItemSchema], default: [] },
  totalAmount: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  status: { type: String, enum: ['pending','completed','cancelled'], default: 'pending' }
}, { timestamps: true });

// Compound unique index per owner to avoid cross-user collisions (scripts in repo rely on this)
PurchaseOrderSchema.index({ owner: 1, poNumber: 1 }, { unique: false });

module.exports = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
