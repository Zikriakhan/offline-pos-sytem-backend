const Customer = require('../models/Customer');

const isAdmin = (req) => req.user && req.user.role === 'admin';

exports.list = async (req, res, next) => {
  try {
    const { name, contact, status } = req.query;

    // base owner filter for non-admins
    const baseFilter = isAdmin(req) ? {} : { owner: req.user.id };

    // build search filters from query params
    const searchFilter = {};
    if (name) searchFilter.name = { $regex: name, $options: 'i' };
    if (contact) searchFilter.contact = { $regex: contact, $options: 'i' };
    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'active') {
        searchFilter.status = 'active';
      } else if (s === 'inactive' || s === 'non-active' || s === 'not active' || s === 'none active') {
        searchFilter.status = { $ne: 'active' };
      } else {
        // exact match for any other provided status value
        searchFilter.status = status;
      }
    }

    const filter = { ...baseFilter, ...searchFilter };
    const customers = await Customer.find(filter);
    res.json(customers);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const c = await Customer.findOne(q);
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json(c);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    data.owner = req.user.id;
    const customer = await Customer.create(data);
    res.status(201).json(customer);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const updated = await Customer.findOneAndUpdate(q, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const deleted = await Customer.findOneAndDelete(q);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
