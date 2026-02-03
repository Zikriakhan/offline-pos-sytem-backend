const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
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

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

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

app.use(errorHandler);

module.exports = app;
