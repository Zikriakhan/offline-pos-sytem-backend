# Digi Khata - Multi-User Store Management System


Item Details	Category	Current Stock	Reorder Level	Purchase Price	Selling Price	Status	Actions
Express + MongoDB backend API following MVC pattern with complete multi-user data isolation.

## 🔐 Multi-User Architecture

This system provides complete data isolation between users:
- **User Authentication**: JWT-based login system
- **Data Security**: Each user can only access their own data
- **Owner-based Filtering**: All data models include `owner` field referencing the user
- **API Protection**: All business APIs require valid JWT tokens

### Core Security Features
- ✅ User-based data filtering using `owner` field
- ✅ JWT token validation on all protected routes
- ✅ Complete data isolation (users cannot see other users' data)
- ✅ Admin role support for system administration
- ✅ Search functionality with user data boundaries

Setup

1. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.
2. Install dependencies:

```bash
npm install
```

3. Run in development:

```bash
npm run dev
```

APIs

- Auth: `POST /api/auth/signup`, `POST /api/auth/login`
- Customers: `/api/customers` (CRUD)
- Suppliers: `/api/suppliers` (CRUD)
- Inventory: `/api/inventory` (CRUD)
- Purchase Orders: `/api/purchase-orders` (CRUD)
- Sales Invoices: `/api/sales-invoices` (CRUD)
- Expenses: `/api/expenses` (CRUD)
- **Show All Data**: `/api/showalldata/me` (Current user), `/api/showalldata/all` (Admin only)

All endpoints require Authorization header `Bearer <token>` except signup/login.


Method	Endpoint	Purpose
POST	/api/auth/signup	Register new user
POST	/api/auth/login	Login (email + password)
GET	/api/auth	List all users
GET	/api/auth/:id	Get user by ID
PUT	/api/auth/:id	Update user (name, email, password)
DELETE	/api/auth/:id	Delete user


//
Auth (Users)

Signup (POST): POST /api/auth/signup
Body:
{ "name": "Alice", "email": "alice@example.com", "password": "secret123" }
curl:
curl -X POST http://localhost:4000/api/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"Alice\",\"email\":\"alice@example.com\",\"password\":\"secret123\"}"
Response contains created user.id.

Login (POST): POST /api/auth/login
Body:
  { "email": "alice@example.com", "password": "secret123" }
curl:
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"alice@example.com\",\"password\":\"secret123\"}"
List (GET): GET /api/auth
curl: curl http://localhost:4000/api/auth

Get (GET): GET /api/auth/:id
curl: curl http://localhost:4000/api/auth/<USER_ID>

Update (PUT): PUT /api/auth/:id — can update name, email, password (server hashes password)
{ "name": "Alice M.", "password": "newpass" }
curl -X PUT http://localhost:4000/api/auth/<USER_ID> -H "Content-Type: application/json" -d "{\"name\":\"Alice M.\",\"password\":\"newpass\"}"

Delete (DELETE): DELETE /api/auth/:id
curl: curl -X DELETE http://localhost:4000/api/auth/<USER_ID>

Customers

Fields: name, contact, totalPurchases, outstanding, status
Create (POST): POST /api/customers
Body:
{ "name": "Customer A", "contact": "0123456789", "totalPurchases": 1200, "outstanding": 200, "status": "active" }
List (GET): GET /api/customers
Get (GET): GET /api/customers/:id
Update (PUT): PUT /api/customers/:id (send only fields to change)
Delete (DELETE): DELETE /api/customers/:id
Example create curl:
curl -X POST http://localhost:4000/api/customers -H "Content-Type: application/json" -d "{\"name\":\"Customer A\",\"contact\":\"0123456789\",\"totalPurchases\":1200,\"outstanding\":200,\"status\":\"active\"}"

Suppliers

Fields: name, contact, totalSupplied, amountPayable, status
Endpoints: POST /api/suppliers, GET /api/suppliers, GET /api/suppliers/:id, PUT /api/suppliers/:id, DELETE /api/suppliers/:id
Create example body:
{ "name": "Supplier X", "contact": "0987654321", "totalSupplied": 5000, "amountPayable": 1000, "status":"active" }
Inventory (Items)

Fields: name, category, currentStock, reorderLevel, purchasePrice, sellingPrice, status
Endpoints: POST /api/inventory, GET /api/inventory, GET /api/inventory/:id, PUT /api/inventory/:id, DELETE /api/inventory/:id
Create example:
{ "name": "Widget A", "category": "Widgets", "currentStock": 50, "reorderLevel": 10, "purchasePrice": 20, "sellingPrice": 30, "status":"active" }



Purchase Orders

Fields: poNumber, supplier (supplier id), date, items (array of { name, quantity, price }), totalAmount, paid, status
Endpoints: POST /api/purchase-orders, GET /api/purchase-orders, GET /api/purchase-orders/:id, PUT /api/purchase-orders/:id, DELETE /api/purchase-orders/:id
Create example:


{
  "poNumber": "PO-1001",
  "supplier": "64supplierId",
  "date": "2025-12-24T00:00:00.000Z",
  "items": [
    { "name": "Widget A", "quantity": 10, "price": 20 },
    { "name": "Widget B", "quantity": 5, "price": 15 }
  ],
  "totalAmount": 275,
  "paid": 100,
  "status": "pending"
}


Sales Invoices

Fields: invoiceNumber, customer (customer id), date, items (array of { name, quantity, price }), totalAmount, received, balance, status
Endpoints: POST /api/sales-invoices, GET /api/sales-invoices, GET /api/sales-invoices/:id, PUT /api/sales-invoices/:id, DELETE /api/sales-invoices/:id
Create example:
{
  "invoiceNumber": "INV-2001",
  "customer": "64...customerId...",
  "date": "2025-12-24T00:00:00.000Z",
  "items": [{ "name": "Widget A", "quantity": 2, "price": 30 }],
  "totalAmount": 60,
  "received": 30,
  "balance": 30,
  "status": "pending"
}
Expenses

Fields: title, category, date, amount, paymentMethod, type (one-time or recurring)
Endpoints: POST /api/expenses, GET /api/expenses, GET /api/expenses/:id, PUT /api/expenses/:id, DELETE /api/expenses/:id
Create example:
  { "title":"Office Rent", "category":"Rent", "date":"2025-12-01T00:00:00.000Z", "amount":500, "paymentMethod":"bank", "type":"one-time" }

## 📊 Show All Data API

### Get Current User's Complete Data
**Endpoint**: `GET /api/showalldata/me`  
**Auth**: Required (Bearer token)  
**Description**: Returns all data for the logged-in user in a nested structure

**Response Structure**:
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe", 
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "data": {
    "customers": [...],
    "inventory": [...],
    "suppliers": [...],
    "purchaseOrders": [...],
    "salesInvoices": [...],
    "expenses": [...]
  },
  "summary": {
    "totalCustomers": 5,
    "totalInventoryItems": 20,
    "totalSuppliers": 3,
    "totalPurchaseOrders": 8,
    "totalSalesInvoices": 12,
    "totalExpenses": 15,
    "totalExpenseAmount": 5000,      // Sum of all expense.amount
    "totalSalesAmount": 25000,       // Sum of all invoice.totalAmount (Total Revenue)
    "totalPurchaseAmount": 15000     // Sum of all purchaseOrder.totalAmount
  }
}
```

**📊 Calculation Formulas**:
- `totalExpenseAmount` = Σ(expense.amount) for all expenses
- `totalSalesAmount` = Σ(invoice.totalAmount) for all sales invoices **← This is Total Revenue**
- `totalPurchaseAmount` = Σ(po.totalAmount) for all purchase orders

**Important Notes**:
- Total Revenue in Dashboard = `totalSalesAmount` from this API
- Total Expenses in Dashboard = `totalExpenseAmount` from this API
- Gross Profit = Calculated on frontend from inventory (Selling Price - Purchase Price)
- Net Profit = Gross Profit - Total Expenses

**Example curl**:
```bash
curl -X GET http://localhost:4000/api/showalldata/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get All Users Data (Admin Only)
**Endpoint**: `GET /api/showalldata/all`  
**Auth**: Required (Admin role)  
**Description**: Returns complete data for all users with system-wide summary

**Response Structure**:
```json
{
  "totalUsers": 3,
  "users": [
    {
      "user": { "id": "...", "name": "User 1", "email": "..." },
      "data": { "customers": [...], "inventory": [...], ... },
      "summary": { "totalCustomers": 5, ... }
    },
    ...
  ],
  "systemSummary": {
    "totalUsers": 3,
    "totalCustomers": 15,
    "totalInventoryItems": 60,
    "totalSuppliers": 9,
    "totalSystemSalesAmount": 75000,
    ...
  }
}
```

**Example curl**:
```bash
curl -X GET http://localhost:4000/api/showalldata/all \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Test the API**:
```bash
# Run comprehensive test with sample data
node test-showalldata-complete.js
```


How to test in Postman (quick):

Select method, set URL (e.g., http://localhost:4000/api/customers).
Under Headers add Content-Type: application/json.
For POST/PUT: Body → raw → JSON, paste example JSON, Send.
For GET/DELETE: just send the request (use :id when needed).
How to extract IDs:

After POST, response will include _id or id (e.g., { "user": { "id":"64..." } } or created document). Use that value in :id or as supplier/customer fields.
If you want, I can:

Provide a Postman collection JSON you can import, or
Run a quick smoke test script to create one of each resource and print IDs.



http://localhost:5000/api/dashboard
{
    "totalRevenue": 0,
    "netProfit": -500,
    "totalCustomers": 2,
    "pendingPayments": 0
}




## 🔍 Search Functionality

All APIs support search with complete user data isolation:

### Customers
```bash
GET /api/customers?status=active
GET /api/customers?contact=01234
GET /api/customers?name=acme
GET /api/customers?name=acme&contact=01234&status=active
```

### Suppliers
```bash
GET /api/suppliers?status=active
GET /api/suppliers?contact=01234
GET /api/suppliers?name=acme
GET /api/suppliers?name=acme&contact=01234&status=active
```

### Inventory
```bash
GET /api/inventory?status=active
GET /api/inventory?category=Widgets
GET /api/inventory?name=widget
GET /api/inventory?name=widget&status=active&category=Electronics
```

### Expenses
```bash
GET /api/expenses?title=rent
GET /api/expenses?category=Office
GET /api/expenses?paymentMethod=bank
GET /api/expenses?type=recurring
GET /api/expenses?category=Office&type=one-time
```

**Note**: All searches are automatically filtered by the logged-in user's data only.

## 🧪 Testing Multi-User Isolation

Run the test script to verify complete data isolation:

```bash
# Start the server first
npm run dev

# In another terminal, run the test
node test-multi-user.js
```

This test creates two users, adds data for each, and verifies that users cannot access each other's data.

Setup
 Mark Invoice as Paid

curl -X PUT http://localhost:5000/api/sales-invoices/INVOICE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "received": 1212.95,
    "status": "paid",
    "notes": "Payment received in full"
  }'
  # Get dashboard metrics
curl -X GET http://localhost:5000/api/sales-invoices/metrics/dashboard \
  -H "Authorization: Bearer $TOKEN"


  # Check Laptop (was 20, now should be 19)
curl -X GET http://localhost:5000/api/inventory \
  -H "Authorization: Bearer $TOKEN" | jq '.items[] | select(.name=="Laptop")'

# Response should show: "currentStock": 19

# Check Mouse (was 100, now should be 98)
curl -X GET http://localhost:5000/api/inventory \
  -H "Authorization: Bearer $TOKEN" | jq '.items[] | select(.name=="Wireless Mouse")'

# Response should show: "currentStock": 98

# Check Keyboard (was 50, now should be 49)
curl -X GET http://localhost:5000/api/inventory \
  -H "Authorization: Bearer $TOKEN" | jq '.items[] | select(.name=="USB Keyboard")'

# Response should show: "currentStock": 49



curl -X POST http://localhost:5000/api/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "sellingPrice": 29.99,
    "currentStock": 100,
    "reorderLevel": 10,
    "purchasePrice": 15,
    "category": "Accessories"
  }'

curl -X POST http://localhost:5000/api/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "USB Keyboard",
    "sellingPrice": 49.99,
    "currentStock": 50,
    "reorderLevel": 5,
    "purchasePrice": 25,
    "category": "Accessories"
  }'

  curl -X POST http://localhost:5000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "contact": "john@example.com",
    "status": "active"
  }'

Step 4: Create Invoice with MULTIPLE Products (The Cart)
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "itemId": "LAPTOP_ID",
        "quantity": 1,
        "unitPrice": 999.99
      },
      {
        "itemId": "MOUSE_ID",
        "quantity": 2,
        "unitPrice": 29.99
      },
      {
        "itemId": "KEYBOARD_ID",
        "quantity": 1,
        "unitPrice": 49.99
      }
    ],
    "customer": "CUSTOMER_ID",
    "paymentMethod": "credit",
    "discount": 50,
    "discountPercentage": 0,
    "tax": 150,
    "taxPercentage": 5,
    "notes": "Corporate order"
  }'
