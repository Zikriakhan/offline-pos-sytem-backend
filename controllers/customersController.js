const Customer = require('../models/Customer');
const CustomerTransaction = require('../models/CustomerTransaction');
const { buildOwnerFilter, getCurrentShopId } = require('../utils/tenantScope');

exports.list = async (req, res, next) => {
  try {
    const { name, contact, status } = req.query;

    const baseFilter = await buildOwnerFilter(req);

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
    const q = { _id: req.params.id, ...(await buildOwnerFilter(req)) };
    const c = await Customer.findOne(q);
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json(c);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    data.owner = req.user.id;
    const shopId = await getCurrentShopId(req);
    if (shopId) data.shop_id = shopId;
    const customer = await Customer.create(data);
    res.status(201).json(customer);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const q = { _id: req.params.id, ...(await buildOwnerFilter(req)) };
    const updated = await Customer.findOneAndUpdate(q, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const q = { _id: req.params.id, ...(await buildOwnerFilter(req)) };
    const deleted = await Customer.findOneAndDelete(q);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

/**
 * Record customer payment
 * POST /customers/:id/payment
 * Body: { amount: number, paidBy?: string, note?: string, transactionDate?: string }
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, paidBy = '', note = '', transactionDate } = req.body;
    const paymentAmount = Number(amount || 0);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    const q = { _id: req.params.id, ...(await buildOwnerFilter(req)) };
    const customer = await Customer.findOne(q);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const currentOutstanding = Number(customer.outstanding || 0);
    const newOutstanding = Math.max(0, currentOutstanding - paymentAmount);

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      { outstanding: newOutstanding },
      { new: true }
    );

    const tx = await CustomerTransaction.create({
      owner: customer.owner,
      shop_id: await getCurrentShopId(req),
      customer: customer._id,
      type: 'payment',
      amount: paymentAmount,
      balanceBefore: currentOutstanding,
      balanceAfter: newOutstanding,
      paidBy,
      note,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      referenceNumber: `CPAY-${Date.now()}`
    });

    res.json({
      message: 'Customer payment recorded successfully',
      customer: updatedCustomer,
      transaction: tx,
      paymentAmount,
      previousOutstanding: currentOutstanding,
      newOutstanding
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List customer payment transactions
 * GET /customers/:id/transactions
 */
exports.listTransactions = async (req, res, next) => {
  try {
    const q = { _id: req.params.id, ...(await buildOwnerFilter(req)) };
    const customer = await Customer.findOne(q).select('_id owner name');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const txFilter = { customer: customer._id, ...(await buildOwnerFilter(req)) };

    const transactions = await CustomerTransaction.find(txFilter)
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    res.json({
      customer: { _id: customer._id, name: customer.name },
      items: transactions
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List aggregated payment summary for all customers owned by user
 * GET /customers/transactions/summary
 */
exports.listTransactionSummary = async (req, res, next) => {
  try {
    const ownerFilter = await buildOwnerFilter(req);

    const pipeline = [
      { $match: { ...ownerFilter, type: 'payment' } },
      { $sort: { transactionDate: 1, createdAt: 1 } },
      {
        $group: {
          _id: '$customer',
          totalPayments: { $sum: '$amount' },
          lastPaymentDate: { $max: '$transactionDate' },
          lastPaidBy: { $last: '$paidBy' }
        }
      },
      {
        $project: {
          _id: 0,
          customer: '$_id',
          totalPayments: 1,
          lastPaymentDate: 1,
          lastPaidBy: 1
        }
      }
    ];

    const items = await CustomerTransaction.aggregate(pipeline);
    res.json({ items });
  } catch (err) {
    next(err);
  }
};
