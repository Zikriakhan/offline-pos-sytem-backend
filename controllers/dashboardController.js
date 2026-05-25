const SalesInvoice = require('../models/SalesInvoice');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const { buildOwnerFilter } = require('../utils/tenantScope');

exports.getDashboard = async (req, res, next) => {
  try {
    const ownerMatch = await buildOwnerFilter(req);

    // Aggregate sales data
    const salesAgg = await SalesInvoice.aggregate([
      { $match: ownerMatch },
      {
        $group: {
          _id: null,
          totalReceived: { $sum: { $ifNull: ['$received', 0] } },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
          totalBalance: { $sum: { $ifNull: ['$balance', 0] } }
        }
      }
    ]);

    // Aggregate expense data
    const expenseAgg = await Expense.aggregate([
      { $match: ownerMatch },
      { $group: { _id: null, totalExpenses: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);

    // Aggregate customer data: total purchases and outstanding payments
    const customerAgg = await Customer.aggregate([
      { $match: ownerMatch },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: { $ifNull: ['$totalPurchases', 0] } },
          totalOutstanding: { $sum: { $ifNull: ['$outstanding', 0] } }
        }
      }
    ]);

    const customersCount = await Customer.countDocuments(ownerMatch);

    // Extract aggregated values
    const sales = salesAgg[0] || { totalReceived: 0, totalAmount: 0, totalBalance: 0 };
    const expenses = (expenseAgg[0] && expenseAgg[0].totalExpenses) || 0;
    const customers = customerAgg[0] || { totalPurchases: 0, totalOutstanding: 0 };

    // Calculate metrics
    const totalRevenue = customers.totalPurchases || 0; // Sum of all customer purchases
    const pendingPayments = customers.totalOutstanding || 0; // Sum of all outstanding amounts
    const netProfit = totalRevenue - expenses;

    res.json({
      totalRevenue,
      netProfit,
      totalCustomers: customersCount,
      pendingPayments,
      // Additional pro-level metrics
      details: {
        salesMetrics: {
          totalSalesInvoiceAmount: sales.totalAmount || 0,
          totalSalesReceived: sales.totalReceived || 0,
          totalSalesBalance: sales.totalBalance || 0
        },
        customerMetrics: {
          totalCustomers: customersCount,
          totalCustomerPurchases: totalRevenue,
          totalOutstandingPayments: pendingPayments
        },
        expenseMetrics: {
          totalExpenses: expenses
        },
        profitMetrics: {
          grossProfit: totalRevenue,
          netProfit: netProfit,
          profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) + '%' : '0%'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
