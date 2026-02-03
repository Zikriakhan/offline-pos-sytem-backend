const User = require('../models/User');
const Customer = require('../models/Customer');
const InventoryItem = require('../models/InventoryItem');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const SalesInvoice = require('../models/SalesInvoice');
const Expense = require('../models/Expense');

const isAdmin = (req) => req.user && req.user.role === 'admin';

// Get all data for current user in nested structure
exports.getCurrentUserAllData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user info
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all user data
    const [customers, inventory, suppliers, purchaseOrders, salesInvoices, expenses] = await Promise.all([
      Customer.find({ owner: userId }),
      InventoryItem.find({ owner: userId }),
      Supplier.find({ owner: userId }),
      PurchaseOrder.find({ owner: userId }).lean(),
      SalesInvoice.find({ owner: userId }).lean(),
      Expense.find({ owner: userId })
    ]);

    // Manually populate supplier names for purchase orders
    const purchaseOrdersWithSupplier = await Promise.all(purchaseOrders.map(async (po) => {
      let supplierName = po.supplierName || '';
      
      if (po.supplier && po.supplier.toString()) {
        try {
          const supplier = await Supplier.findById(po.supplier);
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
          const customer = await Customer.findById(sale.customer);
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
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

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
            const supplier = await Supplier.findById(po.supplier);
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
            const customer = await Customer.findById(sale.customer);
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