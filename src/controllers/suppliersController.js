const Supplier = require('../models/Supplier');
const { processSupplierPayment, processSupplierReturn } = require('../utils/supplierBalance');

const isAdmin = (req) => req.user && req.user.role === 'admin';

function buildSearchFilter(q, fields) {
  if (!q) return {};
  const or = fields.map(f => ({ [f]: { $regex: q, $options: 'i' } }));
  return { $or: or };
}

exports.list = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const { name, contact, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const baseFilter = isAdmin(req) ? {} : { owner: req.user.id };

    // If explicit name/contact/status provided, build filters from them; otherwise fall back to q search
    let filter = { ...baseFilter };

    if (name) filter.name = { $regex: name, $options: 'i' };
    if (contact) filter.contact = { $regex: contact, $options: 'i' };
    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'active') {
        filter.status = 'active';
      } else if (s === 'inactive' || s === 'non-active' || s === 'not active' || s === 'none active') {
        filter.status = { $ne: 'active' };
      } else {
        filter.status = status;
      }
    }

    // if no explicit params but q present, use the existing q-based search across fields
    if (!name && !contact && !status && q) {
      const searchFilter = buildSearchFilter(q, ['name', 'contact', 'status']);
      filter = Object.assign({}, filter, searchFilter);
    }

    const total = await Supplier.countDocuments(filter);
    const items = await Supplier.find(filter).skip((page - 1) * limit).limit(limit);
    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const s = await Supplier.findOne(q);
    if (!s) return res.status(404).json({ message: 'Not found' });
    res.json(s);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try { const data = req.body; data.owner = req.user.id; const supplier = await Supplier.create(data); res.status(201).json(supplier); } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const updated = await Supplier.findOneAndUpdate(q, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const deleted = await Supplier.findOneAndDelete(q);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

/**
 * Record a payment against supplier's outstanding balance
 * POST /suppliers/:id/payment
 * Body: { amount: number }
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const supplier = await Supplier.findOne(q);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Update outstanding balance
    const newBalance = Math.max(0, supplier.outstandingBalance - amount);
    const updated = await Supplier.findByIdAndUpdate(
      supplier._id,
      { outstandingBalance: newBalance },
      { new: true }
    );

    res.json({
      message: 'Payment recorded successfully',
      supplier: updated,
      paymentAmount: amount,
      previousBalance: supplier.outstandingBalance,
      newBalance: updated.outstandingBalance
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Record a return/credit against supplier's outstanding balance
 * POST /suppliers/:id/return
 * Body: { amount: number, reason?: string }
 */
exports.recordReturn = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Return amount must be greater than 0' });
    }

    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const supplier = await Supplier.findOne(q);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // When items are returned, add back to outstanding balance
    const newBalance = supplier.outstandingBalance + amount;
    const updated = await Supplier.findByIdAndUpdate(
      supplier._id,
      { outstandingBalance: newBalance },
      { new: true }
    );

    res.json({
      message: 'Return recorded successfully',
      supplier: updated,
      returnAmount: amount,
      reason: reason || 'Items returned to supplier',
      previousBalance: supplier.outstandingBalance,
      newBalance: updated.outstandingBalance
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Adjust supplier's outstanding balance directly
 * PATCH /suppliers/:id/balance
 * Body: { newBalance: number }
 */
exports.adjustBalance = async (req, res, next) => {
  try {
    const { newBalance } = req.body;
    
    if (typeof newBalance !== 'number' || newBalance < 0) {
      return res.status(400).json({ message: 'Balance must be a non-negative number' });
    }

    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const supplier = await Supplier.findOne(q);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const updated = await Supplier.findByIdAndUpdate(
      supplier._id,
      { outstandingBalance: newBalance },
      { new: true }
    );

    res.json({
      message: 'Balance adjusted successfully',
      supplier: updated,
      previousBalance: supplier.outstandingBalance,
      newBalance: updated.outstandingBalance
    });
  } catch (err) {
    next(err);
  }
};
