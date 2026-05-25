const Expense = require('../models/Expense');
const { buildOwnerFilter, getCurrentShopId } = require('../utils/tenantScope');

function buildSearchFilter(q, fields) {
	if (!q) return {};
	const or = fields.map(f => ({ [f]: { $regex: q, $options: 'i' } }));
	return { $or: or };
}

exports.list = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const { title, category, paymentMethod, type } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const baseFilter = await buildOwnerFilter(req);

    // Build explicit filters if provided, otherwise fall back to q-based search
    let filter = { ...baseFilter };
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (paymentMethod) filter.paymentMethod = { $regex: paymentMethod, $options: 'i' };
    if (type) filter.type = type;

    // If no explicit params but q present, use the existing q-based search across fields
    if (!title && !category && !paymentMethod && !type && q) {
      const searchFilter = buildSearchFilter(q, ['title', 'category', 'paymentMethod', 'type']);
      filter = Object.assign({}, filter, searchFilter);
    }

    const total = await Expense.countDocuments(filter);
    const items = await Expense.find(filter).skip((page - 1) * limit).limit(limit);
    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
};
exports.get = async (req, res, next) => { try { const q = { _id: req.params.id, ...(await buildOwnerFilter(req)) }; const e = await Expense.findOne(q); if (!e) return res.status(404).json({ message: 'Not found' }); res.json(e); } catch (err) { next(err); } };
exports.create = async (req, res, next) => { try { const data = req.body; data.owner = req.user.id; const shopId = await getCurrentShopId(req); if (shopId) data.shop_id = shopId; const ex = await Expense.create(data); res.status(201).json(ex); } catch (err) { next(err); } };
exports.update = async (req, res, next) => { try { const q = { _id: req.params.id, ...(await buildOwnerFilter(req)) }; const updated = await Expense.findOneAndUpdate(q, req.body, { new: true }); if (!updated) return res.status(404).json({ message: 'Not found' }); res.json(updated); } catch (err) { next(err); } };
exports.remove = async (req, res, next) => { try { const q = { _id: req.params.id, ...(await buildOwnerFilter(req)) }; const deleted = await Expense.findOneAndDelete(q); if (!deleted) return res.status(404).json({ message: 'Not found' }); res.json({ message: 'Deleted' }); } catch (err) { next(err); } };
