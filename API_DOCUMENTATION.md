# Sales & Inventory Management API Documentation

## Overview
This is a comprehensive backend API for managing inventory and sales transactions in a Point of Sale (POS) system. The API is built with Node.js, Express.js, and MongoDB.

---

## Authentication

All endpoints (except `/api/auth/*`) require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

**Base URL**: `http://localhost:5000/api`

---

## Inventory Management API

### 1. List All Items

**Endpoint**: `GET /inventory`

**Query Parameters**:
- `page` (default: 1) - Page number for pagination
- `limit` (default: 10, max: 100) - Items per page
- `q` - General search query (searches name, category, description)
- `name` - Filter by item name
- `category` - Filter by category
- `status` - Filter by status (active/inactive)

**Response**:
```json
{
  "items": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "owner": "user_id",
      "name": "Product A",
      "category": "Electronics",
      "description": "Description here",
      "currentStock": 50,
      "reorderLevel": 10,
      "unitOfMeasure": "piece",
      "purchasePrice": 100,
      "sellingPrice": 150,
      "totalQuantitySold": 25,
      "totalTransactions": 5,
      "totalRevenue": 3750,
      "status": "active",
      "createdAt": "2024-01-20T10:30:00Z",
      "updatedAt": "2024-01-24T15:45:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10
}
```

---

### 2. Get Single Item

**Endpoint**: `GET /inventory/:id`

**Response**: Returns single item object (see structure above)

---

### 3. Create New Item

**Endpoint**: `POST /inventory`

**Request Body**:
```json
{
  "name": "Product Name",
  "category": "Electronics",
  "description": "Product description",
  "currentStock": 100,
  "reorderLevel": 20,
  "unitOfMeasure": "piece",
  "purchasePrice": 50,
  "sellingPrice": 100,
  "status": "active"
}
```

**Required Fields**: `name`, `sellingPrice`

**Optional Fields**: All others (with defaults shown above)

**Response**: Returns created item object with `_id` (HTTP 201)

---

### 4. Update Item

**Endpoint**: `PUT /inventory/:id`

**Request Body** (send only fields to update):
```json
{
  "name": "Updated Name",
  "category": "New Category",
  "sellingPrice": 120,
  "reorderLevel": 15,
  "status": "inactive"
}
```

**Updatable Fields**: name, category, description, reorderLevel, unitOfMeasure, purchasePrice, sellingPrice, status

**Note**: Stock is managed through sales, purchases, and dedicated adjustment endpoint

**Response**: Returns updated item object

---

### 5. Delete Item

**Endpoint**: `DELETE /inventory/:id`

**Response**:
```json
{
  "message": "Item deleted successfully"
}
```

---

### 6. Adjust Stock (Manual Adjustment)

**Endpoint**: `POST /inventory/:id/adjust-stock`

**Request Body**:
```json
{
  "adjustment": 50,
  "reason": "Inventory count correction"
}
```

**Required Fields**: `adjustment` (positive or negative number, cannot be zero)

**Optional Fields**: `reason` (default: "Manual adjustment")

**Response**:
```json
{
  "message": "Stock adjusted by 50. Reason: Inventory count correction",
  "item": { /* updated item object */ }
}
```

---

### 7. Get Low Stock Alerts

**Endpoint**: `GET /inventory/alerts/low-stock`

**Response**:
```json
{
  "count": 3,
  "items": [
    {
      "_id": "...",
      "name": "Product A",
      "currentStock": 8,
      "reorderLevel": 10,
      /* ... other fields */
    }
  ]
}
```

Returns all active items where `currentStock <= reorderLevel`

---

### 8. Get Inventory Statistics

**Endpoint**: `GET /inventory/analytics/stats`

**Response**:
```json
{
  "totalItems": 50,
  "activeItems": 45,
  "inactiveItems": 5,
  "totalStockValue": 50000,
  "totalSalesValue": 125000,
  "totalQuantityInStock": 2500,
  "totalQuantitySold": 1200,
  "averageStockLevel": 50,
  "lowStockCount": 3,
  "topSellingItems": [
    {
      "id": "...",
      "name": "Best Seller",
      "totalSold": 500,
      "totalRevenue": 50000,
      "currentStock": 100
    }
  ]
}
```

---

## Sales & Invoice Management API

### 1. Create Sales Invoice

**Endpoint**: `POST /sales-invoices`

**Request Body**:
```json
{
  "items": [
    {
      "itemId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "quantity": 5,
      "unitPrice": 150
    },
    {
      "itemId": "65a1b2c3d4e5f6g7h8i9j0k2",
      "quantity": 3,
      "unitPrice": 200
    }
  ],
  "customer": "customer_id",
  "paymentMethod": "cash",
  "discount": 100,
  "discountPercentage": 0,
  "tax": 50,
  "taxPercentage": 5,
  "notes": "Special order"
}
```

**Required Fields**: 
- `items` (array with at least 1 item)
  - `itemId`: ID of the inventory item
  - `quantity`: Quantity sold (must be > 0 and available in stock)
  - `unitPrice`: Price per unit

**Optional Fields**:
- `customer`: Customer ID (for customer tracking)
- `paymentMethod`: cash, credit, cheque, bank_transfer, card, other (default: cash)
- `discount`: Discount amount (default: 0)
- `discountPercentage`: Discount percentage (default: 0)
- `tax`: Tax amount (default: 0)
- `taxPercentage`: Tax percentage (default: 0)
- `notes`: Additional notes (default: empty)

**Response** (HTTP 201):
```json
{
  "_id": "...",
  "owner": "user_id",
  "invoiceNumber": "INV-20240124-0001",
  "customer": {
    "_id": "customer_id",
    "name": "John Doe",
    "contact": "john@example.com"
  },
  "invoiceDate": "2024-01-24T10:30:00Z",
  "items": [
    {
      "itemId": { "_id": "...", "name": "Product A" },
      "quantity": 5,
      "unitPrice": 150,
      "itemTotal": 750
    }
  ],
  "paymentMethod": "cash",
  "subtotal": 1300,
  "discount": 100,
  "discountPercentage": 0,
  "tax": 60,
  "taxPercentage": 5,
  "grandTotal": 1260,
  "received": 0,
  "balance": 1260,
  "notes": "Special order",
  "status": "pending",
  "createdAt": "2024-01-24T10:30:00Z",
  "updatedAt": "2024-01-24T10:30:00Z"
}
```

**Side Effects**:
- Stock is automatically reduced for all items in the invoice
- Customer data is updated with purchase amount and outstanding balance
- Inventory statistics are updated with sales data

---

### 2. List Sales Invoices

**Endpoint**: `GET /sales-invoices`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `q` - Search by invoice number, status, or item name

**Response**:
```json
{
  "items": [ /* array of invoices */ ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

---

### 3. Get Single Invoice

**Endpoint**: `GET /sales-invoices/:id`

**Response**: Returns single invoice with populated customer and item references

---

### 4. Update Invoice

**Endpoint**: `PUT /sales-invoices/:id`

**Request Body** (send only fields to update):
```json
{
  "paymentMethod": "credit",
  "discount": 150,
  "discountPercentage": 10,
  "tax": 75,
  "taxPercentage": 6,
  "received": 500,
  "notes": "Updated notes",
  "status": "paid"
}
```

**Updatable Fields**: paymentMethod, discount, discountPercentage, tax, taxPercentage, received, notes, status

**Note**: Items cannot be modified after creation. Delete and recreate if needed.

**Automatic Calculations**:
- `grandTotal` is recalculated if discount/tax changes
- `balance` is updated based on `received` amount

**Response**: Returns updated invoice

---

### 5. Delete Invoice

**Endpoint**: `DELETE /sales-invoices/:id`

**Response**:
```json
{
  "message": "Invoice deleted and stock reversed"
}
```

**Side Effects**:
- Stock quantities are reversed for all items
- Customer purchase data is reversed
- Inventory statistics are reversed

---

### 6. Get Item Sales Statistics

**Endpoint**: `GET /sales-invoices/items/:itemId/stats`

**Response**:
```json
{
  "itemId": "...",
  "itemName": "Product A",
  "totalQuantitySold": 250,
  "totalTransactions": 45,
  "totalRevenue": 37500,
  "currentStock": 150,
  "averageRevenuePerTransaction": 833.33
}
```

---

### 7. Get All Items Sales Statistics

**Endpoint**: `GET /sales-invoices/items/stats/all`

**Response**:
```json
[
  {
    "itemId": "...",
    "itemName": "Best Seller",
    "currentStock": 200,
    "sellingPrice": 150,
    "totalQuantitySold": 500,
    "totalTransactions": 100,
    "totalRevenue": 75000,
    "averageRevenuePerTransaction": 750
  },
  /* ... more items sorted by totalRevenue descending */
]
```

---

### 8. Get Sales Dashboard Metrics

**Endpoint**: `GET /sales-invoices/metrics/dashboard`

**Response**:
```json
{
  "totalInvoices": 150,
  "paidInvoices": 120,
  "pendingInvoices": 25,
  "totalRevenue": 500000,
  "totalDiscount": 15000,
  "totalTax": 25000,
  "totalOutstanding": 50000,
  "totalReceived": 450000
}
```

---

## Customer Management API

### 1. List Customers

**Endpoint**: `GET /customers`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10)
- `q` - Search by name or contact
- `status` - Filter by active/inactive

**Response**:
```json
{
  "items": [
    {
      "_id": "customer_id",
      "name": "John Doe",
      "contact": "john@example.com",
      "totalPurchases": 15000,
      "outstanding": 2000,
      "status": "active"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

---

### 2. Create Customer

**Endpoint**: `POST /customers`

**Request Body**:
```json
{
  "name": "John Doe",
  "contact": "john@example.com",
  "status": "active"
}
```

**Required Fields**: `name`

**Response**: Returns created customer object (HTTP 201)

---

### 3. Update Customer

**Endpoint**: `PUT /customers/:id`

**Request Body**:
```json
{
  "name": "Updated Name",
  "contact": "newemail@example.com",
  "status": "inactive"
}
```

**Response**: Returns updated customer

---

### 4. Delete Customer

**Endpoint**: `DELETE /customers/:id`

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200**: Successful GET/PUT request
- **201**: Successful POST request
- **400**: Bad request (validation error)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found
- **500**: Server error

**Error Response Format**:
```json
{
  "message": "Error description"
}
```

---

## Data Validation Rules

### Inventory Item
- `name`: Required, string
- `sellingPrice`: Required, >= 0
- `purchasePrice`: >= 0
- `currentStock`: >= 0
- `reorderLevel`: >= 0
- `unitOfMeasure`: one of [piece, kg, liter, meter, box, pack, other]
- `status`: one of [active, inactive]

### Sales Invoice
- At least 1 item required
- Each item:
  - `itemId`: Valid inventory item ID (must be accessible to user)
  - `quantity`: > 0 and <= available stock
  - `unitPrice`: >= 0
- `paymentMethod`: one of [cash, credit, cheque, bank_transfer, card, other]
- `discount`: >= 0
- `discountPercentage`: 0-100
- `tax`: >= 0
- `taxPercentage`: 0-100
- `status`: one of [draft, pending, paid, cancelled]

### Customer
- `name`: Required, string
- `contact`: Optional, string
- `status`: one of [active, inactive]

---

## Invoice Number Generation

Invoice numbers are generated automatically in the format: `INV-YYYYMMDD-XXXX`
- `YYYYMMDD`: Current date
- `XXXX`: Sequential 4-digit counter (resets daily)

Example: `INV-20240124-0001`, `INV-20240124-0002`

---

## Stock Management Logic

### When Creating an Invoice:
1. Validates that all items exist and have sufficient stock
2. Reduces stock for each item by the sold quantity
3. Increments item's `totalQuantitySold`, `totalTransactions`, `totalRevenue`

### When Updating an Invoice:
- Stock changes are NOT reversed/re-applied (invoice items are immutable)

### When Deleting an Invoice:
- All stock quantities are restored
- Sales statistics are reversed
- Customer purchase data is reversed

### Manual Stock Adjustment:
- Use the `/inventory/:id/adjust-stock` endpoint
- Supports both positive (add) and negative (remove) adjustments

---

## Calculations & Formulas

### Invoice Totals
```
itemTotal = quantity × unitPrice
subtotal = SUM(itemTotal for all items)

discountAmount = discount + (subtotal × discountPercentage ÷ 100)
afterDiscount = subtotal - discountAmount

taxAmount = tax + (afterDiscount × taxPercentage ÷ 100)
grandTotal = afterDiscount + taxAmount

balance = grandTotal - received
```

### Inventory Statistics
```
totalStockValue = SUM(currentStock × purchasePrice for all items)
totalSalesValue = SUM(totalRevenue for all items)
averageStockLevel = SUM(currentStock) ÷ number of items
```

---

## Best Practices

1. **Always use valid item IDs**: Verify item exists before creating invoices
2. **Check stock levels**: Use low-stock alerts before stock runs out
3. **Proper payment tracking**: Update `received` amount to track payments
4. **Customer management**: Link invoices to customers for better tracking
5. **Data consistency**: Use proper discount/tax calculations
6. **Regular backups**: Keep database backups of critical data
7. **Invoice archival**: Consider marking old invoices as 'paid' or 'cancelled' for organization

---

## Rate Limiting & Performance

- Default page limit: 10 items
- Maximum page limit: 100 items
- Recommended to use pagination for large datasets
- Use search filters to reduce result sets

---

## Example Workflows

### Complete Sale Process
```
1. POST /inventory (create items first, if not exists)
2. POST /customers (create customer, optional)
3. POST /sales-invoices (create invoice with items)
4. PUT /sales-invoices/:id (update received amount when payment made)
```

### Stock Management
```
1. POST /inventory (create new item)
2. GET /inventory/alerts/low-stock (check for low stock)
3. POST /inventory/:id/adjust-stock (adjust if manual count differs)
4. GET /inventory/analytics/stats (get overall statistics)
```

### Sales Analysis
```
1. GET /sales-invoices/items/stats/all (see all item stats)
2. GET /sales-invoices/items/:itemId/stats (deep dive into specific item)
3. GET /sales-invoices/metrics/dashboard (overall sales metrics)
```

---

## Support & Debugging

For debugging, enable detailed logging and check:
- JWT token validity
- User ownership of resources
- Stock availability before sale
- Proper data type conversions
- Database connection status

---

**API Version**: 1.0.0  
**Last Updated**: January 24, 2025  
**Status**: Production Ready
