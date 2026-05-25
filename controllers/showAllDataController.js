const User = require('../models/User');
const Customer = require('../models/Customer');
const InventoryItem = require('../models/InventoryItem');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const SalesInvoice = require('../models/SalesInvoice');
const Expense = require('../models/Expense');
const { buildOwnerFilter } = require('../utils/tenantScope');

// Get all data for current user in nested structure
exports.getCurrentUserAllData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const ownerFilter = await buildOwnerFilter(req);
    
    // Get user info
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all user data
    const [customers, inventory, suppliers, purchaseOrders, salesInvoices, expenses] = await Promise.all([
      Customer.find(ownerFilter),
      InventoryItem.find(ownerFilter),
      Supplier.find(ownerFilter),
      PurchaseOrder.find(ownerFilter).lean(),
      SalesInvoice.find(ownerFilter).lean(),
      Expense.find(ownerFilter)
    ]);

    // Manually populate supplier names for purchase orders
    const purchaseOrdersWithSupplier = await Promise.all(purchaseOrders.map(async (po) => {
      let supplierName = po.supplierName || '';
      
      if (po.supplier && po.supplier.toString()) {
        try {
          const supplier = await Supplier.findOne({ _id: po.supplier, ...(await buildOwnerFilter(req)) });
          if (supplier) {
            supplierName = supplier.name;
          }
        } catch (err) {
          console.log('Failed to populate supplier for PO:', err.message);
        }
      }
      
      return {
        ...po,
        supplierName: supplierName || 'Unknown Supplier'
      };
    }));

    // Manually populate customer names for sales invoices
    const salesInvoicesWithCustomer = await Promise.all(salesInvoices.map(async (sale) => {
      let customerName = sale.customerName || '';
      
      if (sale.customer && sale.customer.toString()) {
        try {
          const customer = await Customer.findOne({ _id: sale.customer, ...(await buildOwnerFilter(req)) });
          if (customer) {
            customerName = customer.name;
          }
        } catch (err) {
          console.log('Failed to populate customer for sale:', err.message);
        }
      }
      
      return {
        ...sale,
        customerName: customerName || 'Unknown Customer'
      };
    }));

    // Debug: Log expense calculations
    console.log('📊 Expense Calculation Debug:', {
      totalExpenseCount: expenses.length,
      expenseAmounts: expenses.slice(0, 3).map(e => ({ title: e.title, amount: e.amount })),
      calculatedTotal: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    });

    // Debug: Log sales calculations
    console.log('💰 Sales Calculation Debug:', {
      totalSalesCount: salesInvoicesWithCustomer.length,
      salesAmounts: salesInvoicesWithCustomer.slice(0, 3).map(s => ({ invoice: s.invoiceNumber, grandTotal: s.grandTotal, totalAmount: s.totalAmount })),
      calculatedTotal: salesInvoicesWithCustomer.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0)
    });

    const userData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      data: {
        customers: customers,
        inventory: inventory,
        suppliers: suppliers,
        purchaseOrders: purchaseOrdersWithSupplier,
        salesInvoices: salesInvoicesWithCustomer,
        expenses: expenses
      },
      summary: {
        totalCustomers: customers.length,
        totalInventoryItems: inventory.length,
        totalSuppliers: suppliers.length,
        totalPurchaseOrders: purchaseOrdersWithSupplier.length,
        totalSalesInvoices: salesInvoicesWithCustomer.length,
        totalExpenses: expenses.length,
        totalExpenseAmount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
        totalSalesAmount: salesInvoicesWithCustomer.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0),
        totalPurchaseAmount: purchaseOrdersWithSupplier.reduce((sum, po) => sum + (po.totalAmount || 0), 0)
      }
    };

    res.json(userData);
  } catch (err) {
    next(err);
  }
};

// Get all users with their complete data (Admin only)
exports.getAllUsersWithData = async (req, res, next) => {
  try {
    return res.status(403).json({
      message: 'Cross-tenant data access is disabled by policy for multi-user data isolation'
    });

    // Get all users
    const users = await User.find().select('-password');
    
    const allUsersData = [];

    for (const user of users) {
      // Get all data for each user
      const [customers, inventory, suppliers, purchaseOrders, salesInvoices, expenses] = await Promise.all([
        Customer.find({ owner: user._id }),
        InventoryItem.find({ owner: user._id }),
        Supplier.find({ owner: user._id }),
        PurchaseOrder.find({ owner: user._id }).lean(),
        SalesInvoice.find({ owner: user._id }).lean(),
        Expense.find({ owner: user._id })
      ]);

      // Manually populate supplier names
      const purchaseOrdersWithSupplier = await Promise.all(purchaseOrders.map(async (po) => {
        let supplierName = po.supplierName || '';
        if (po.supplier && po.supplier.toString()) {
          try {
            const supplier = await Supplier.findOne({ _id: po.supplier, owner: user._id });
            if (supplier) supplierName = supplier.name;
          } catch (err) {
            console.log('Failed to populate supplier:', err.message);
          }
        }
        return { ...po, supplierName: supplierName || 'Unknown Supplier' };
      }));

      // Manually populate customer names
      const salesInvoicesWithCustomer = await Promise.all(salesInvoices.map(async (sale) => {
        let customerName = sale.customerName || '';
        if (sale.customer && sale.customer.toString()) {
          try {
            const customer = await Customer.findOne({ _id: sale.customer, owner: user._id });
            if (customer) customerName = customer.name;
          } catch (err) {
            console.log('Failed to populate customer:', err.message);
          }
        }
        return { ...sale, customerName: customerName || 'Unknown Customer' };
      }));

      const userData = {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt
        },
        data: {
          customers: customers,
          inventory: inventory,
          suppliers: suppliers,
          purchaseOrders: purchaseOrdersWithSupplier,
          salesInvoices: salesInvoicesWithCustomer,
          expenses: expenses
        },
        summary: {
          totalCustomers: customers.length,
          totalInventoryItems: inventory.length,
          totalSuppliers: suppliers.length,
          totalPurchaseOrders: purchaseOrdersWithSupplier.length,
          totalSalesInvoices: salesInvoicesWithCustomer.length,
          totalExpenses: expenses.length,
          totalExpenseAmount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
          totalSalesAmount: salesInvoicesWithCustomer.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0),
          totalPurchaseAmount: purchaseOrdersWithSupplier.reduce((sum, po) => sum + (po.totalAmount || 0), 0)
        }
      };

      allUsersData.push(userData);
    }

    res.json({
      totalUsers: users.length,
      users: allUsersData,
      systemSummary: {
        totalUsers: users.length,
        totalCustomers: allUsersData.reduce((sum, user) => sum + user.summary.totalCustomers, 0),
        totalInventoryItems: allUsersData.reduce((sum, user) => sum + user.summary.totalInventoryItems, 0),
        totalSuppliers: allUsersData.reduce((sum, user) => sum + user.summary.totalSuppliers, 0),
        totalPurchaseOrders: allUsersData.reduce((sum, user) => sum + user.summary.totalPurchaseOrders, 0),
        totalSalesInvoices: allUsersData.reduce((sum, user) => sum + user.summary.totalSalesInvoices, 0),
        totalExpenses: allUsersData.reduce((sum, user) => sum + user.summary.totalExpenses, 0),
        totalSystemExpenseAmount: allUsersData.reduce((sum, user) => sum + user.summary.totalExpenseAmount, 0),
        totalSystemSalesAmount: allUsersData.reduce((sum, user) => sum + user.summary.totalSalesAmount, 0),
        totalSystemPurchaseAmount: allUsersData.reduce((sum, user) => sum + user.summary.totalPurchaseAmount, 0)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Delete a customer for the current user
exports.deleteCurrentUserCustomer = async (req, res, next) => {
  try {
    const query = { _id: req.params.id, ...(await buildOwnerFilter(req)) };

    const deleted = await Customer.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// Admin: delete a customer for a specific user
exports.deleteUserCustomerAdmin = async (req, res, next) => {
  try {
    return res.status(403).json({
      message: 'Cross-tenant customer deletion is disabled by policy for multi-user data isolation'
    });

    const query = { _id: req.params.id, owner: req.params.userId };
    const deleted = await Customer.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};