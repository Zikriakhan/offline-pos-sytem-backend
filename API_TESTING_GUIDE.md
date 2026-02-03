# API Testing Guide & Examples

## Quick Start Testing

### 1. Get Authentication Token

First, authenticate to get a JWT token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user"
  }
}
```

Save the token for use in subsequent requests.

---

## Complete Workflow Example

### Step 1: Create Inventory Items

```bash
TOKEN="your_jwt_token_here"

# Create first item - Laptop
curl -X POST http://localhost:5000/api/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "category": "Electronics",
    "description": "High-performance business laptop",
    "currentStock": 25,
    "reorderLevel": 5,
    "unitOfMeasure": "piece",
    "purchasePrice": 600,
    "sellingPrice": 999.99,
    "status": "active"
  }'

# Response:
# {
#   "_id": "item_id_1",
#   "invoiceNumber": "INV-20240124-0001",
#   ...
# }
# Save this item_id_1

# Create second item - Mouse
curl -X POST http://localhost:5000/api/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "category": "Accessories",
    "description": "Ergonomic wireless mouse",
    "currentStock": 100,
    "reorderLevel": 20,
    "unitOfMeasure": "piece",
    "purchasePrice": 15,
    "sellingPrice": 29.99,
    "status": "active"
  }'

# Save this as item_id_2
```

### Step 2: Create a Customer

```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Corporation",
    "contact": "sales@abccorp.com",
    "status": "active"
  }'

# Response will have _id
# Save this as customer_id
```

### Step 3: Create Sales Invoice

```bash
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "itemId": "item_id_1",
        "quantity": 2,
        "unitPrice": 999.99
      },
      {
        "itemId": "item_id_2",
        "quantity": 10,
        "unitPrice": 29.99
      }
    ],
    "customer": "customer_id",
    "paymentMethod": "credit",
    "discount": 50,
    "discountPercentage": 0,
    "tax": 0,
    "taxPercentage": 5,
    "notes": "Corporate bulk order"
  }'

# Response:
# {
#   "_id": "invoice_id",
#   "invoiceNumber": "INV-20240124-0001",
#   "items": [
#     {
#       "itemId": "item_id_1",
#       "name": "Laptop",
#       "quantity": 2,
#       "unitPrice": 999.99,
#       "itemTotal": 1999.98
#     },
#     ...
#   ],
#   "subtotal": 2299.88,
#   "discount": 50,
#   "tax": 112.49,
#   "grandTotal": 2362.37,
#   "balance": 2362.37,
#   "status": "pending"
# }
# Save invoice_id
```

### Step 4: Check Stock After Sale

```bash
# Get inventory stats
curl -X GET http://localhost:5000/api/inventory/analytics/stats \
  -H "Authorization: Bearer $TOKEN"

# Response shows:
# {
#   "totalItems": 2,
#   "activeItems": 2,
#   "totalStockValue": 16485,
#   "totalSalesValue": 2362.37,
#   "totalQuantityInStock": 108,  # Was 125, now 108 (2 laptops + 10 mice sold)
#   "totalQuantitySold": 12,
#   ...
# }
```

### Step 5: Update Invoice with Payment

```bash
curl -X PUT http://localhost:5000/api/sales-invoices/invoice_id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "received": 2362.37,
    "status": "paid",
    "paymentMethod": "credit",
    "notes": "Payment received in full via credit card"
  }'

# Response shows:
# {
#   ...
#   "received": 2362.37,
#   "balance": 0,
#   "status": "paid"
# }
```

### Step 6: Get Sales Statistics

```bash
# Dashboard metrics
curl -X GET http://localhost:5000/api/sales-invoices/metrics/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "totalInvoices": 1,
#   "paidInvoices": 1,
#   "pendingInvoices": 0,
#   "totalRevenue": 2362.37,
#   "totalDiscount": 50,
#   "totalTax": 112.49,
#   "totalOutstanding": 0,
#   "totalReceived": 2362.37
# }

# Item-specific stats
curl -X GET http://localhost:5000/api/sales-invoices/items/item_id_1/stats \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "itemId": "item_id_1",
#   "itemName": "Laptop",
#   "totalQuantitySold": 2,
#   "totalTransactions": 1,
#   "totalRevenue": 1999.98,
#   "currentStock": 23,
#   "averageRevenuePerTransaction": 1999.98
# }
```

---

## Testing Different Scenarios

### Scenario 1: Multiple Sales to Same Item

```bash
# First sale - 5 units
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "itemId": "item_id_2",
      "quantity": 5,
      "unitPrice": 29.99
    }],
    "paymentMethod": "cash",
    "discount": 10,
    "tax": 15,
    "taxPercentage": 3
  }'

# Second sale - 3 units
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "itemId": "item_id_2",
      "quantity": 3,
      "unitPrice": 29.99
    }],
    "paymentMethod": "credit"
  }'

# Get item stats - shows accumulated data
curl -X GET http://localhost:5000/api/sales-invoices/items/stats/all \
  -H "Authorization: Bearer $TOKEN"

# Mouse will show:
# totalQuantitySold: 8
# totalTransactions: 2
# totalRevenue: 239.92
```

### Scenario 2: Discount Calculations

```bash
# Percentage-based discount
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "itemId": "item_id_1",
      "quantity": 1,
      "unitPrice": 999.99
    }],
    "paymentMethod": "cash",
    "discount": 0,
    "discountPercentage": 10,
    "tax": 0,
    "taxPercentage": 0
  }'

# Calculation:
# subtotal: 999.99
# discount (10%): 99.99
# grandTotal: 900.00

# Fixed discount + percentage discount
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "itemId": "item_id_1",
      "quantity": 2,
      "unitPrice": 999.99
    }],
    "paymentMethod": "cash",
    "discount": 100,
    "discountPercentage": 5,
    "tax": 0,
    "taxPercentage": 0
  }'

# Calculation:
# subtotal: 1999.98
# discount: 100 + (1999.98 × 5%) = 199.98
# grandTotal: 1800.00
```

### Scenario 3: Tax Calculations

```bash
# VAT tax
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"itemId": "item_id_1", "quantity": 1, "unitPrice": 999.99},
      {"itemId": "item_id_2", "quantity": 5, "unitPrice": 29.99}
    ],
    "paymentMethod": "cash",
    "discount": 50,
    "tax": 0,
    "taxPercentage": 17
  }'

# Calculation:
# subtotal: 1149.94
# discount: 50
# afterDiscount: 1099.94
# tax (17%): 187.00
# grandTotal: 1286.94
```

### Scenario 4: Low Stock Alert

```bash
# Check low stock items
curl -X GET http://localhost:5000/api/inventory/alerts/low-stock \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "count": 1,
#   "items": [
#     {
#       "_id": "item_id_1",
#       "name": "Laptop",
#       "currentStock": 23,
#       "reorderLevel": 5,
#       "status": "active"
#       // ... other fields
#     }
#   ]
# }
```

### Scenario 5: Manual Stock Adjustment

```bash
# Add stock (goods received)
curl -X POST http://localhost:5000/api/inventory/item_id_1/adjust-stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adjustment": 50,
    "reason": "Stock received from supplier PO#12345"
  }'

# Response:
# {
#   "message": "Stock adjusted by 50. Reason: Stock received from supplier PO#12345",
#   "item": { ... updated item ... }
# }

# Remove stock (damaged/stolen)
curl -X POST http://localhost:5000/api/inventory/item_id_2/adjust-stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adjustment": -5,
    "reason": "5 units damaged in warehouse"
  }'
```

### Scenario 6: Invoice Deletion & Stock Reversal

```bash
# Before deletion: stock was 23 for Laptop, 90 for Mouse

# Delete an invoice
curl -X DELETE http://localhost:5000/api/sales-invoices/invoice_id \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "message": "Invoice deleted and stock reversed"
# }

# Check stock - should be restored
curl -X GET http://localhost:5000/api/inventory/item_id_1 \
  -H "Authorization: Bearer $TOKEN"

# currentStock will be increased back by sold quantities
```

---

## Advanced Testing

### Performance Testing

```bash
# List with pagination
curl -X GET "http://localhost:5000/api/inventory?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Search with filters
curl -X GET "http://localhost:5000/api/inventory?category=Electronics&status=active" \
  -H "Authorization: Bearer $TOKEN"

# Search by query
curl -X GET "http://localhost:5000/api/inventory?q=laptop" \
  -H "Authorization: Bearer $TOKEN"

# Search invoices
curl -X GET "http://localhost:5000/api/sales-invoices?q=INV-20240124" \
  -H "Authorization: Bearer $TOKEN"
```

### Error Scenarios

```bash
# 1. Try to create invoice with non-existent item
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"itemId": "invalid_id", "quantity": 1, "unitPrice": 100}],
    "paymentMethod": "cash"
  }'
# Response (400): "Item with ID invalid_id not found"

# 2. Try to sell more than available stock
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"itemId": "item_id_1", "quantity": 1000, "unitPrice": 999.99}],
    "paymentMethod": "cash"
  }'
# Response (400): "Insufficient stock for item 'Laptop'. Available: 23, Requested: 1000"

# 3. Try to adjust stock to negative
curl -X POST http://localhost:5000/api/inventory/item_id_1/adjust-stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adjustment": -1000, "reason": "test"}'
# Response (400): "Cannot adjust stock. New stock would be negative..."

# 4. Missing authorization
curl -X GET http://localhost:5000/api/inventory
# Response (401): "Authorization required"

# 5. Invalid token
curl -X GET http://localhost:5000/api/inventory \
  -H "Authorization: Bearer invalid_token"
# Response (401): "Invalid or expired token"
```

---

## Testing with Node.js/JavaScript

### Simple Test Script

```javascript
const BASE_URL = 'http://localhost:5000/api';
let token = '';
let itemId1, itemId2, customerId, invoiceId;

// Helper function
async function request(method, endpoint, body = null, auth = true) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (auth && token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return response.json();
}

// Test workflow
async function runTests() {
  console.log('1. Authenticating...');
  const loginRes = await request('POST', '/auth/login', {
    email: 'user@example.com',
    password: 'password123'
  }, false);
  token = loginRes.token;
  console.log('✓ Authenticated');

  console.log('\n2. Creating inventory items...');
  const item1 = await request('POST', '/inventory', {
    name: 'Laptop',
    sellingPrice: 999.99,
    currentStock: 25,
    reorderLevel: 5
  });
  itemId1 = item1._id;
  console.log('✓ Created item:', item1.name);

  const item2 = await request('POST', '/inventory', {
    name: 'Mouse',
    sellingPrice: 29.99,
    currentStock: 100
  });
  itemId2 = item2._id;
  console.log('✓ Created item:', item2.name);

  console.log('\n3. Creating customer...');
  const customer = await request('POST', '/customers', {
    name: 'Test Company',
    contact: 'contact@test.com'
  });
  customerId = customer._id;
  console.log('✓ Created customer:', customer.name);

  console.log('\n4. Creating sales invoice...');
  const invoice = await request('POST', '/sales-invoices', {
    items: [
      { itemId: itemId1, quantity: 2, unitPrice: 999.99 },
      { itemId: itemId2, quantity: 10, unitPrice: 29.99 }
    ],
    customer: customerId,
    paymentMethod: 'credit',
    discount: 50,
    taxPercentage: 5
  });
  invoiceId = invoice._id;
  console.log('✓ Created invoice:', invoice.invoiceNumber);
  console.log('  Grand Total:', invoice.grandTotal);

  console.log('\n5. Getting sales metrics...');
  const metrics = await request('GET', '/sales-invoices/metrics/dashboard');
  console.log('✓ Sales Metrics:');
  console.log('  Total Revenue:', metrics.totalRevenue);
  console.log('  Total Invoices:', metrics.totalInvoices);
  console.log('  Total Outstanding:', metrics.totalOutstanding);

  console.log('\n6. Getting item statistics...');
  const stats = await request('GET', `/sales-invoices/items/${itemId1}/stats`);
  console.log('✓ Item Stats for', stats.itemName);
  console.log('  Total Sold:', stats.totalQuantitySold);
  console.log('  Transactions:', stats.totalTransactions);
  console.log('  Revenue:', stats.totalRevenue);

  console.log('\n✅ All tests passed!');
}

runTests().catch(err => console.error('Test failed:', err));
```

---

## Integration Testing

### Test Customer Workflow

```javascript
// Full customer lifecycle
async function testCustomerWorkflow() {
  // 1. Create customer
  const customer = await request('POST', '/customers', {
    name: 'John Smith',
    contact: 'john@example.com'
  });
  
  // 2. Create multiple invoices for same customer
  const invoices = [];
  for (let i = 0; i < 3; i++) {
    const invoice = await request('POST', '/sales-invoices', {
      items: [{ itemId: itemId1, quantity: 1, unitPrice: 999.99 }],
      customer: customer._id,
      paymentMethod: 'credit'
    });
    invoices.push(invoice);
  }
  
  // 3. Check customer total purchases
  const finalCustomer = await request('GET', `/customers/${customer._id}`);
  console.log('Customer total purchases:', finalCustomer.totalPurchases);
  console.log('Outstanding balance:', finalCustomer.outstanding);
  
  // 4. Make partial payment
  await request('PUT', `/sales-invoices/${invoices[0]._id}`, {
    received: 500
  });
  
  // 5. Final verification
  const finalInvoice = await request('GET', `/sales-invoices/${invoices[0]._id}`);
  console.log('Invoice balance:', finalInvoice.balance);
}
```

---

## Monitoring & Logging

### Enable Debug Logging

Set in `.env`:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

Monitor server logs:
```bash
npm run dev
```

You'll see:
```
GET /api/inventory 200 12.345 ms
POST /api/sales-invoices 201 45.678 ms
PUT /api/sales-invoices/:id 200 8.901 ms
```

---

## Performance Benchmarks

Expected response times (approximate):
- List items: 10-50ms
- Create item: 20-100ms
- Create invoice: 50-200ms (includes stock updates)
- Get metrics: 20-100ms
- List invoices: 15-50ms

---

## Conclusion

These examples cover the main use cases and testing scenarios. For production testing, consider:
- Load testing with ab or k6
- API contract testing
- Integration tests with database
- End-to-end tests with frontend

---

**Last Updated**: January 24, 2025
