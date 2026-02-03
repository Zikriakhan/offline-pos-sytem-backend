# Backend Implementation Guide

## Project Structure Overview

```
src/
├── app.js                    # Express app setup
├── server.js                 # Server entry point
├── config/
│   └── db.js                 # MongoDB connection
├── models/
│   ├── User.js               # User model
│   ├── Customer.js           # Customer model
│   ├── InventoryItem.js      # Inventory/Product model (ENHANCED)
│   ├── SalesInvoice.js       # Sales invoice model (ENHANCED)
│   ├── PurchaseOrder.js      # Purchase order model
│   ├── Supplier.js           # Supplier model
│   └── Expense.js            # Expense model
├── controllers/
│   ├── authController.js
│   ├── inventoryController.js (ENHANCED)
│   ├── salesController.js    (ENHANCED)
│   ├── customersController.js
│   ├── suppliersController.js
│   ├── purchaseOrdersController.js
│   ├── expensesController.js
│   ├── dashboardController.js
│   └── showAllDataController.js
├── routes/
│   ├── authRoutes.js
│   ├── inventoryRoutes.js    (ENHANCED)
│   ├── salesRoutes.js        (ENHANCED)
│   ├── customersRoutes.js
│   ├── suppliersRoutes.js
│   ├── purchaseOrdersRoutes.js
│   ├── expensesRoutes.js
│   ├── dashboardRoutes.js
│   └── showAllDataRoutes.js
└── middleware/
    ├── auth.js               # JWT authentication
    └── errorHandler.js       # Error handling
```

---

## Key Enhancements Made

### 1. SalesInvoice Model (Enhanced)

**New Fields Added**:
- `invoiceDate`: Date/time of sale
- `paymentMethod`: Type of payment (cash, credit, etc.)
- `subtotal`: Sum of all item totals
- `discount`: Discount amount
- `discountPercentage`: Discount percentage
- `tax`: Tax/VAT amount
- `taxPercentage`: Tax percentage
- `grandTotal`: Final amount (subtotal - discount + tax)
- `notes`: Additional notes

**Item Structure**:
```javascript
{
  itemId: ObjectId,      // Reference to InventoryItem
  name: String,          // Item name (denormalized for reports)
  quantity: Number,      // Quantity sold
  unitPrice: Number,     // Price per unit
  itemTotal: Number      // quantity × unitPrice
}
```

---

### 2. InventoryItem Model (Enhanced)

**New Fields Added**:
- `description`: Item description
- `unitOfMeasure`: Unit (piece, kg, liter, etc.)
- `totalQuantitySold`: Total quantity sold (auto-updated)
- `totalTransactions`: Number of sales transactions (auto-updated)
- `totalRevenue`: Total revenue from this item (auto-updated)

**Auto-Updated on Sale**:
- When invoice is created: `currentStock` decreases, sales metrics increase
- When invoice is deleted: Stock is restored, sales metrics reversed

---

### 3. InventoryController (Enhanced)

**New Methods**:
- `adjustStock()`: Manually adjust stock with reason tracking
- `getLowStockAlerts()`: Get items below reorder level
- `getInventoryStats()`: Get comprehensive inventory statistics

**Enhanced Methods**:
- Proper input validation
- Better error messages
- Pagination and filtering

---

### 4. SalesController (Complete Rewrite)

**New Methods**:
- `generateInvoiceNumber()`: Auto-generate unique invoice numbers
- `validateAndPrepareInvoiceItems()`: Validate items and check stock
- `calculateInvoiceTotals()`: Calculate subtotal, discount, tax, grandTotal
- `updateInventoryStock()`: Update inventory on sale
- `updateCustomerData()`: Update customer purchase data
- `getItemSalesStats()`: Get stats for specific item
- `getAllItemsSalesStats()`: Get stats for all items
- `getSalesMetrics()`: Get sales dashboard metrics

**Key Features**:
- Stock validation before sale
- Automatic invoice number generation
- Customer data synchronization
- Proper error handling
- Stock reversal on invoice deletion

---

### 5. Route Enhancements

**New Routes Added**:
```
Sales Routes:
POST   /api/sales-invoices                           Create invoice
GET    /api/sales-invoices                           List invoices
GET    /api/sales-invoices/:id                       Get single invoice
PUT    /api/sales-invoices/:id                       Update invoice
DELETE /api/sales-invoices/:id                       Delete invoice
GET    /api/sales-invoices/metrics/dashboard         Sales metrics
GET    /api/sales-invoices/items/stats/all           All items sales stats
GET    /api/sales-invoices/items/:itemId/stats       Single item stats

Inventory Routes:
POST   /api/inventory                                Create item
GET    /api/inventory                                List items
GET    /api/inventory/:id                            Get single item
PUT    /api/inventory/:id                            Update item
DELETE /api/inventory/:id                            Delete item
POST   /api/inventory/:id/adjust-stock               Manual stock adjustment
GET    /api/inventory/alerts/low-stock               Low stock alerts
GET    /api/inventory/analytics/stats                Inventory statistics
```

---

## Business Logic Implementation

### A. Sales Transaction Flow

```
1. Client sends invoice creation request with items
   ↓
2. System validates:
   - All items exist and belong to user
   - Stock is sufficient for each item
   - Valid payment method and amounts
   ↓
3. System calculates:
   - Item totals (quantity × unitPrice)
   - Subtotal
   - Discount (amount or percentage)
   - Tax (amount or percentage)
   - Grand total
   ↓
4. System generates invoice:
   - Auto-generated invoice number
   - Invoice date/time
   ↓
5. System updates inventory:
   - Reduces stock for each item
   - Increments totalQuantitySold
   - Increments totalTransactions
   - Adds to totalRevenue
   ↓
6. System updates customer (if provided):
   - Adds to totalPurchases
   - Adds to outstanding balance
   ↓
7. Invoice stored with status 'pending'
```

### B. Stock Management Flow

```
Manual Adjustment:
  POST /inventory/:id/adjust-stock
    → Validate adjustment (not zero)
    → Check new stock won't be negative
    → Update inventory
    → Reason stored in logs

Low Stock Alert:
  GET /inventory/alerts/low-stock
    → Find items where currentStock <= reorderLevel
    → Filter to active items only
    → Return sorted by urgency

Automatic (On Sale):
  POST /sales-invoices
    → Before sale: Check stock availability
    → During save: Decrement stock, update metrics
    → After save: Return confirmation

Reversal (On Delete):
  DELETE /sales-invoices/:id
    → Restore stock for all items
    → Reverse sales metrics
    → Reverse customer data
```

### C. Financial Calculations

```
Item-Level:
  itemTotal = quantity × unitPrice

Invoice-Level:
  subtotal = SUM(itemTotal for all items)
  
  discountAmount = discount
  if (discountPercentage > 0):
    discountAmount += (subtotal × discountPercentage ÷ 100)
  
  afterDiscount = subtotal - discountAmount
  
  taxAmount = tax
  if (taxPercentage > 0):
    taxAmount += (afterDiscount × taxPercentage ÷ 100)
  
  grandTotal = afterDiscount + taxAmount
  balance = grandTotal - received

Item Statistics:
  averageRevenuePerTransaction = totalRevenue ÷ totalTransactions
```

---

## Security Considerations

### 1. User Isolation
- Every resource is tied to `owner: userId`
- Users can only access their own data
- Admin role can access all data

### 2. Stock Integrity
- Stock cannot go negative
- Inventory updates are atomic (per item)
- Stock reversals on transaction deletion

### 3. Data Validation
- All inputs validated before processing
- Price and quantity must be non-negative
- Payment method is enum-restricted

### 4. Error Handling
- Descriptive error messages
- Proper HTTP status codes
- No sensitive data in errors

---

## Database Indexes

Added indexes for performance:

```javascript
SalesInvoice:
  - { owner: 1, invoiceDate: -1 }    // For list queries
  - { customer: 1 }                   // For customer lookups
  - { invoiceNumber: 1, owner: 1 }    // For number lookup

InventoryItem:
  - { owner: 1, name: 1 }             // For searches
  - { owner: 1, status: 1 }           // For status filters
```

---

## Testing Examples

### Example 1: Create an Item

```bash
curl -X POST http://localhost:5000/api/inventory \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "category": "Electronics",
    "description": "High-performance laptop",
    "currentStock": 20,
    "reorderLevel": 5,
    "unitOfMeasure": "piece",
    "purchasePrice": 600,
    "sellingPrice": 900,
    "status": "active"
  }'
```

### Example 2: Create a Sales Invoice

```bash
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "itemId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "quantity": 2,
        "unitPrice": 900
      },
      {
        "itemId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "quantity": 5,
        "unitPrice": 150
      }
    ],
    "customer": "customer_id",
    "paymentMethod": "credit",
    "discount": 200,
    "discountPercentage": 0,
    "tax": 100,
    "taxPercentage": 5,
    "notes": "Corporate order"
  }'
```

### Example 3: Get Sales Metrics

```bash
curl -X GET http://localhost:5000/api/sales-invoices/metrics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Manual Stock Adjustment

```bash
curl -X POST http://localhost:5000/api/inventory/65a1b2c3d4e5f6g7h8i9j0k1/adjust-stock \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adjustment": -5,
    "reason": "Damaged units removed from inventory"
  }'
```

### Example 5: Get Item Statistics

```bash
curl -X GET http://localhost:5000/api/sales-invoices/items/65a1b2c3d4e5f6g7h8i9j0k1/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Scenarios & Handling

### Stock Validation Error
```
Request: Create invoice with insufficient stock
Response (400):
{
  "message": "Insufficient stock for item 'Laptop'. Available: 5, Requested: 10"
}
```

### Invalid Item Error
```
Request: Create invoice with non-existent itemId
Response (404):
{
  "message": "Item with ID 65a1b2c3d4e5f6g7h8i9j0k1 not found"
}
```

### Negative Stock Error
```
Request: Adjust stock by -100 when current is 50
Response (400):
{
  "message": "Cannot adjust stock. New stock would be negative (Current: 50, Adjustment: -100)"
}
```

### Unauthorized Access
```
Request: Try to access other user's item
Response (401 or 403):
{
  "message": "Not found" or "Forbidden"
}
```

---

## Performance Optimization

### Pagination
- Always use pagination for list endpoints
- Default limit: 10, Maximum: 100
- Example: `GET /api/inventory?page=2&limit=20`

### Filtering
- Use specific filters instead of general search
- Example: `GET /api/inventory?status=active&category=Electronics`

### Sorting
- Results sorted by relevant fields (createdAt, invoiceDate, etc.)
- For sales: sorted by invoiceDate descending

### Indexing
- Database indexes created for common queries
- Optimize search by using available query parameters

---

## Future Enhancements

1. **Batch Operations**
   - Bulk upload items
   - Batch create invoices
   - Batch stock adjustments

2. **Advanced Analytics**
   - Sales trends over time
   - Customer purchase patterns
   - Profitability analysis per item

3. **Inventory Forecasting**
   - Predictive reorder suggestions
   - Demand forecasting

4. **Multi-location Support**
   - Warehouse management
   - Stock transfers between locations

5. **Advanced Payment Tracking**
   - Payment installments
   - Automatic invoice reminders
   - Late payment tracking

6. **Integration**
   - API webhooks
   - Third-party accounting software
   - E-commerce platform integration

---

## Troubleshooting

### Problem: Stock not updating on sale
- Check that itemId is valid
- Verify item belongs to correct user
- Check stock is sufficient before sale

### Problem: Invoice not created
- Verify all items exist
- Check stock availability
- Validate request body format
- Check JWT token validity

### Problem: Customer data not updating
- Ensure customer ID is valid
- Customer must belong to same user
- Invoice must reference valid customer

### Problem: Sales metrics incorrect
- Run inventory stats to verify
- Check for deleted/reversed invoices
- Verify calculations in database

---

## Database Backup & Recovery

```bash
# Backup MongoDB database
mongodump --uri "mongodb://..." --out ./backup

# Restore MongoDB database
mongorestore --uri "mongodb://..." ./backup
```

---

## Deployment Checklist

- [ ] Set JWT_SECRET in environment
- [ ] Configure MongoDB connection string
- [ ] Set NODE_ENV=production
- [ ] Enable CORS properly
- [ ] Setup error logging
- [ ] Database backup strategy
- [ ] API rate limiting (recommended)
- [ ] HTTPS enabled
- [ ] API documentation deployed
- [ ] Test all endpoints

---

## Support Resources

- API Documentation: See API_DOCUMENTATION.md
- Model Schemas: Check src/models/
- Controller Logic: Check src/controllers/
- Route Definitions: Check src/routes/

---

**Document Version**: 1.0.0  
**Last Updated**: January 24, 2025  
**Author**: Development Team
