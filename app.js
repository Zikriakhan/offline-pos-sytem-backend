const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const customersRoutes = require('./routes/customersRoutes');
const suppliersRoutes = require('./routes/suppliersRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const purchaseOrdersRoutes = require('./routes/purchaseOrdersRoutes');
const salesRoutes = require('./routes/salesRoutes');
const salesReturnsRoutes = require('./routes/salesReturnsRoutes');
const expensesRoutes = require('./routes/expensesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const showAllDataRoutes = require('./routes/showAllDataRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const shopRoutes = require('./routes/shopRoutes');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
// Session support (optional - requires installing `express-session`)
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Serve uploaded shop logos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/', (req, res) => {
  res.send('Welcome to DigiKhata API');
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/sales-invoices', salesRoutes);
app.use('/api/sales-returns', salesReturnsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/showalldata', showAllDataRoutes);
app.use('/api/permission', permissionRoutes);
app.use('/api/shop', shopRoutes);

app.use(errorHandler);

module.exports = app;
