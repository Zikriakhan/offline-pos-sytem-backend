const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("==================================");

      console.log("AUTH APIs:");
      console.log("POST   /api/auth/signup");
      console.log("POST   /api/auth/login");
      console.log("----------------------------------");

      console.log("CUSTOMERS APIs:");
      console.log("GET    /api/customers");
      console.log("POST   /api/customers");
      console.log("PUT    /api/customers/:id");
      console.log("DELETE /api/customers/:id");
      console.log("----------------------------------");

      console.log("SUPPLIERS APIs:");
      console.log("GET    /api/suppliers");
      console.log("POST   /api/suppliers");
      console.log("PUT    /api/suppliers/:id");
      console.log("DELETE /api/suppliers/:id");
      console.log("----------------------------------");

      console.log("INVENTORY APIs:");
      console.log("GET    /api/inventory");
      console.log("POST   /api/inventory");
      console.log("PUT    /api/inventory/:id");
      console.log("DELETE /api/inventory/:id");
      console.log("----------------------------------");

      console.log("PURCHASE ORDERS APIs:");
      console.log("GET    /api/purchase-orders");
      console.log("POST   /api/purchase-orders");
      console.log("PUT    /api/purchase-orders/:id");
      console.log("DELETE /api/purchase-orders/:id");
      console.log("----------------------------------");

      console.log("SALES INVOICES APIs:");
      console.log("GET    /api/sales-invoices");
      console.log("POST   /api/sales-invoices");
      console.log("PUT    /api/sales-invoices/:id");
      console.log("DELETE /api/sales-invoices/:id");
      console.log("----------------------------------");

      console.log("SALES RETURNS APIs:");
      console.log("GET    /api/sales-returns          (Get all returns)");
      console.log("GET    /api/sales-returns/stats    (Get statistics)");
      console.log("GET    /api/sales-returns/:id      (Get by ID)");
      console.log("POST   /api/sales-returns          (Create return)");
      console.log("PUT    /api/sales-returns/:id      (Update return)");
      console.log("PUT    /api/sales-returns/:id/approve        (Approve return)");
      console.log("PUT    /api/sales-returns/:id/process-refund (Process refund)");
      console.log("DELETE /api/sales-returns/:id      (Cancel return)");
      console.log("----------------------------------");

      console.log("EXPENSES APIs:");
      console.log("GET    /api/expenses");
      console.log("POST   /api/expenses");
      console.log("PUT    /api/expenses/:id");
      console.log("DELETE /api/expenses/:id");
      console.log("----------------------------------");

      console.log("SHOW ALL DATA APIs:");
      console.log("GET    /api/showalldata/me      (Current user's complete data)");
      console.log("GET    /api/showalldata/all     (All users data - Admin only)");

      console.log("==================================");
    });
   
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
