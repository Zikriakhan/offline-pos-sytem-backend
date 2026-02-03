# System Architecture & Design Document

## System Overview

The Digi-Khata Backend is a scalable, production-ready API for managing sales and inventory operations. It follows a layered architecture pattern with clear separation of concerns.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│            Client Applications                   │
│        (Web, Mobile, Desktop UI)                │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼ HTTP/REST
┌─────────────────────────────────────────────────┐
│          Express.js Server (Port 5000)          │
├─────────────────────────────────────────────────┤
│               Routes Layer                       │
│  - inventoryRoutes.js                           │
│  - salesRoutes.js                               │
│  - customersRoutes.js                           │
├─────────────────────────────────────────────────┤
│            Middleware Layer                      │
│  - JWT Authentication                           │
│  - Error Handling                               │
│  - Request Logging (Morgan)                     │
├─────────────────────────────────────────────────┤
│          Controllers Layer                       │
│  - inventoryController.js                       │
│  - salesController.js                           │
│  - customersController.js                       │
├─────────────────────────────────────────────────┤
│            Services Layer                        │
│  - Stock Management                             │
│  - Invoice Calculation                          │
│  - Data Validation                              │
├─────────────────────────────────────────────────┤
│             Models Layer                         │
│  - InventoryItem                                │
│  - SalesInvoice                                 │
│  - Customer                                     │
│  - User                                         │
├─────────────────────────────────────────────────┤
│           Database Layer                         │
│              MongoDB                             │
└─────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Sales Transaction Flow

```
Client Request
    │
    ▼
[POST /api/sales-invoices]
    │
    ├─→ Authentication Check (JWT)
    │
    ├─→ Validate Request Body
    │   - Check items exist
    │   - Validate prices/quantities
    │   - Verify customer (if provided)
    │
    ├─→ Check Stock Availability
    │   ├─ For each item:
    │   │  └─ Fetch from InventoryItem
    │   │  └─ Compare currentStock vs requested quantity
    │   │  └─ Return error if insufficient
    │
    ├─→ Calculate Financial Totals
    │   ├─ itemTotal = quantity × unitPrice
    │   ├─ subtotal = SUM(itemTotal)
    │   ├─ discount = fixed + (subtotal × discountPercentage%)
    │   ├─ tax = fixed + ((subtotal - discount) × taxPercentage%)
    │   └─ grandTotal = subtotal - discount + tax
    │
    ├─→ Generate Invoice
    │   ├─ Auto-generate invoiceNumber
    │   ├─ Set status = 'pending'
    │   └─ Create in MongoDB
    │
    ├─→ Update Inventory (Atomic)
    │   ├─ For each item:
    │   │  ├─ currentStock -= quantity
    │   │  ├─ totalQuantitySold += quantity
    │   │  ├─ totalTransactions += 1
    │   │  └─ totalRevenue += itemTotal
    │
    ├─→ Update Customer (if provided)
    │   ├─ totalPurchases += grandTotal
    │   └─ outstanding += grandTotal
    │
    └─→ Response: Invoice with all details (201)
```

### 2. Stock Update on Invoice Deletion

```
Client Request: DELETE /api/sales-invoices/:id
    │
    ▼
[Fetch Invoice]
    │
    ├─→ For each invoice item:
    │   ├─ Fetch associated InventoryItem
    │   ├─ Restore: currentStock += item.quantity
    │   ├─ Reverse: totalQuantitySold -= item.quantity
    │   ├─ Reverse: totalTransactions -= 1
    │   └─ Reverse: totalRevenue -= item.itemTotal
    │
    ├─→ Reverse Customer Data (if exists)
    │   ├─ totalPurchases -= invoice.grandTotal
    │   └─ outstanding -= invoice.grandTotal
    │
    ├─→ Delete Invoice from MongoDB
    │
    └─→ Response: Success confirmation
```

### 3. Data Query & Reporting Flow

```
Client Request: GET /api/sales-invoices/metrics/dashboard
    │
    ▼
[Query MongoDB]
    │
    ├─→ Fetch all SalesInvoices for user
    │
    ├─→ Calculate Metrics:
    │   ├─ totalInvoices = COUNT(invoices)
    │   ├─ paidInvoices = COUNT(status='paid')
    │   ├─ pendingInvoices = COUNT(status='pending')
    │   ├─ totalRevenue = SUM(grandTotal)
    │   ├─ totalDiscount = SUM(discount)
    │   ├─ totalTax = SUM(tax)
    │   ├─ totalReceived = SUM(received)
    │   └─ totalOutstanding = SUM(balance)
    │
    └─→ Response: Metrics object (200)
```

---

## Database Schema

### InventoryItem Collection

```javascript
{
  _id: ObjectId,
  owner: ObjectId(User),
  name: String,
  category: String,
  description: String,
  currentStock: Number,
  reorderLevel: Number,
  unitOfMeasure: String (enum),
  purchasePrice: Number,
  sellingPrice: Number,
  totalQuantitySold: Number,    // Auto-updated
  totalTransactions: Number,    // Auto-updated
  totalRevenue: Number,         // Auto-updated
  status: String (enum),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ owner: 1, name: 1 }` - For name searches
- `{ owner: 1, status: 1 }` - For status filters

---

### SalesInvoice Collection

```javascript
{
  _id: ObjectId,
  owner: ObjectId(User),
  invoiceNumber: String (unique),
  customer: ObjectId(Customer) | null,
  invoiceDate: Date,
  items: [
    {
      itemId: ObjectId(InventoryItem),
      name: String,
      quantity: Number,
      unitPrice: Number,
      itemTotal: Number
    }
  ],
  paymentMethod: String (enum),
  subtotal: Number,
  discount: Number,
  discountPercentage: Number,
  tax: Number,
  taxPercentage: Number,
  grandTotal: Number,
  received: Number,
  balance: Number,
  notes: String,
  status: String (enum),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ owner: 1, invoiceDate: -1 }` - For sorting/filtering
- `{ customer: 1 }` - For customer lookups
- `{ invoiceNumber: 1, owner: 1 }` - For number search

---

### Customer Collection

```javascript
{
  _id: ObjectId,
  owner: ObjectId(User),
  name: String,
  contact: String,
  totalPurchases: Number,
  outstanding: Number,
  status: String (enum),
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Route Organization

### REST Principles Applied

```
Resource          Method    Endpoint                        Action
─────────────────────────────────────────────────────────────────
InventoryItem     GET       /inventory                      List
                  POST      /inventory                      Create
                  GET       /inventory/:id                  Retrieve
                  PUT       /inventory/:id                  Update
                  DELETE    /inventory/:id                  Delete

Stock             POST      /inventory/:id/adjust-stock     Adjust
Alert             GET       /inventory/alerts/low-stock     List Low Stock
Analytics         GET       /inventory/analytics/stats      Get Stats

Invoice           GET       /sales-invoices                 List
                  POST      /sales-invoices                 Create
                  GET       /sales-invoices/:id             Retrieve
                  PUT       /sales-invoices/:id             Update
                  DELETE    /sales-invoices/:id             Delete

Reporting         GET       /sales-invoices/items/:id/stats Per-Item Stats
                  GET       /sales-invoices/items/stats/all All Items Stats
                  GET       /sales-invoices/metrics/…       Dashboard

Customer          GET       /customers                      List
                  POST      /customers                      Create
                  GET       /customers/:id                  Retrieve
                  PUT       /customers/:id                  Update
                  DELETE    /customers/:id                  Delete
```

---

## Authentication & Authorization

### JWT Token Flow

```
User Login
    ├─ POST /api/auth/login
    ├─ Verify credentials
    └─ Issue JWT token with payload:
       {
         id: userId,
         role: 'user' | 'admin',
         iat: timestamp,
         exp: timestamp + 7 days
       }

Client stores token and includes in subsequent requests:
    Authorization: Bearer <token>

Middleware validates token:
    ├─ Extract token from Authorization header
    ├─ Verify signature using JWT_SECRET
    ├─ Decode payload
    └─ Attach user info to request (req.user)
       └─ Allow route handler to proceed
```

### Access Control

```
Scenario 1: Regular User
    - Can access only their own resources
    - Cannot access other users' data
    - Filter: { owner: req.user.id }

Scenario 2: Admin User
    - Can access all resources
    - No owner filter applied
    - Full access to all endpoints

Authorization Check:
    ├─ JWT authentication (all routes except /auth/*)
    └─ User isolation (owner field matching)
```

---

## Financial Calculation Engine

### Invoice Total Calculation

```
Step 1: Item Totals
    For each item:
    itemTotal = quantity × unitPrice

Step 2: Subtotal
    subtotal = Σ(itemTotal for all items)

Step 3: Discount Calculation
    Option A: Fixed discount only
        discountAmount = discount value
    
    Option B: Percentage discount only
        discountAmount = subtotal × (discountPercentage / 100)
    
    Option C: Both (both applied additively)
        discountAmount = discount + (subtotal × discountPercentage / 100)
    
    afterDiscount = subtotal - discountAmount

Step 4: Tax Calculation
    Option A: Fixed tax only
        taxAmount = tax value
    
    Option B: Percentage tax only
        taxAmount = afterDiscount × (taxPercentage / 100)
    
    Option C: Both (both applied additively)
        taxAmount = tax + (afterDiscount × taxPercentage / 100)

Step 5: Grand Total
    grandTotal = afterDiscount + taxAmount

Step 6: Balance Tracking
    balance = grandTotal - received
```

---

## Error Handling Strategy

### Error Response Format

```
{
  "statusCode": 400 | 401 | 403 | 404 | 500,
  "message": "User-friendly error message"
}
```

### Error Types & Status Codes

```
200 OK
    - Successful GET, PUT, DELETE

201 Created
    - Successful POST (resource created)

400 Bad Request
    - Invalid input data
    - Validation errors
    - Business logic violations
    - Examples:
        * Insufficient stock
        * Invalid item ID
        * Negative stock adjustment
        * Missing required fields

401 Unauthorized
    - Missing or invalid token
    - Token expired

403 Forbidden
    - Insufficient permissions
    - Attempting to access other user's data (non-admin)

404 Not Found
    - Resource doesn't exist
    - Item not owned by user

500 Internal Server Error
    - Server-side exceptions
    - Database errors
    - Unexpected conditions
```

---

## Performance Considerations

### Indexing Strategy

```
InventoryItem Indexes:
  1. { owner: 1, name: 1 }
     - Optimizes name-based searches for user items
     
  2. { owner: 1, status: 1 }
     - Optimizes status filtering

SalesInvoice Indexes:
  1. { owner: 1, invoiceDate: -1 }
     - Optimizes invoice listing and date-based queries
     
  2. { customer: 1 }
     - Optimizes customer-specific invoice lookups
     
  3. { invoiceNumber: 1, owner: 1 }
     - Optimizes invoice number searches
```

### Query Optimization

```
Pagination:
    - Default limit: 10 items
    - Maximum limit: 100 items
    - Reduces payload and response time

Projection:
    - Only select needed fields
    - Example: select('name totalSold totalRevenue')
    - Reduces data transfer

Population Limits:
    - Only populate when needed
    - Don't populate on list endpoints if not required
    - Use field selection on populate

Sorting:
    - Index on sort fields
    - Example: invoiceDate: -1 (descending)
```

---

## Data Consistency Guarantees

### Stock Management Atomicity

```
Sale Transaction:
    1. Validate stock availability
    2. Create invoice
    3. Update inventory
    4. Update customer

If any step fails:
    - Invoice creation fails
    - No stock update occurs
    - No customer data modified
    - Transaction is rolled back
```

### Stock Reversal Guarantee

```
When invoice is deleted:
    1. Fetch invoice with all items
    2. For each item:
       - Restore stock
       - Reverse statistics
    3. Delete invoice
    
If deletion fails:
    - Invoice still exists
    - Stock remains accurate
    - No partial updates
```

---

## Scalability Considerations

### Horizontal Scaling

```
Current Architecture:
    └─ Single Node.js instance
       └─ MongoDB single instance

For horizontal scaling:
    ├─ Load Balancer
    │  ├─ Node.js Server 1
    │  ├─ Node.js Server 2
    │  └─ Node.js Server N
    ├─ Session Management (Redis)
    └─ MongoDB Replica Set
```

### Database Optimization for Scale

```
Future Enhancements:
    1. Add more indexes if needed
    2. Implement caching layer (Redis)
    3. Database connection pooling
    4. Read replicas for analytics queries
    5. Sharding by owner/tenant
```

---

## Security Architecture

### Request Validation Pipeline

```
Incoming Request
    ▼
1. CORS Check
    ├─ Verify origin
    └─ Allow/Block request
    ▼
2. Rate Limiting (Future)
    ├─ Check request rate
    └─ Return 429 if exceeded
    ▼
3. JWT Authentication
    ├─ Extract token
    ├─ Verify signature
    └─ Attach user to request
    ▼
4. Input Validation
    ├─ Type checking
    ├─ Range validation
    ├─ Enum validation
    └─ Required fields
    ▼
5. Authorization
    ├─ Check resource ownership
    └─ Verify permissions
    ▼
6. Business Logic
    ├─ Stock validation
    ├─ Customer check
    └─ Financial calculations
    ▼
Response
```

---

## Deployment Architecture

### Development

```
Local Machine
├─ Node.js (npm run dev)
├─ MongoDB (local or docker)
└─ Hot-reload enabled
```

### Production

```
Production Server
├─ Node.js with PM2 clustering
├─ MongoDB Atlas (managed service)
├─ Environment variables from secrets
├─ HTTPS/SSL enabled
├─ CORS configured
└─ Error logging enabled
```

---

## Technology Choices Rationale

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js | Async I/O, large ecosystem |
| Framework | Express.js | Lightweight, flexible, well-documented |
| Database | MongoDB | Flexible schema, document-oriented, scalable |
| Auth | JWT | Stateless, scalable, no session storage needed |
| Logging | Morgan | Simple HTTP logging, good for debugging |
| Validation | Native | Keep dependencies minimal initially |

---

## Future Architecture Enhancements

```
Phase 2 - Advanced Features
    ├─ Cache layer (Redis)
    ├─ Message queue (RabbitMQ)
    ├─ Event streaming (Kafka)
    └─ Microservices (if needed)

Phase 3 - Analytics
    ├─ Data warehouse (Elasticsearch)
    ├─ Analytics engine (Apache Spark)
    └─ Business intelligence (Tableau)

Phase 4 - Integration
    ├─ API gateway (Kong)
    ├─ Third-party webhooks
    └─ Payment gateways
```

---

## System Reliability

### Fault Tolerance

```
Database Connection Failure:
    ├─ Retry mechanism (3 attempts)
    ├─ Connection pool management
    └─ Graceful degradation

Server Crash:
    ├─ PM2 auto-restart
    └─ Load balancer failover

Request Timeout:
    ├─ Timeout limits (30s default)
    └─ Graceful error response
```

### Backup & Recovery

```
Database Backups:
    ├─ MongoDB Atlas automated backups
    ├─ Point-in-time recovery
    └─ Regular backup testing

Code Deployment:
    ├─ Git version control
    ├─ Zero-downtime deployment
    └─ Rollback capability
```

---

## Monitoring & Observability

### Key Metrics

```
Application Metrics:
    - Request/response times
    - Error rates (4xx, 5xx)
    - Active connections
    - CPU/Memory usage

Database Metrics:
    - Query execution times
    - Connection pool usage
    - Document count per collection
    - Index usage

Business Metrics:
    - Total sales revenue
    - Invoices created/day
    - Inventory turnover
    - Customer lifetime value
```

---

**Document Version**: 1.0.0  
**Last Updated**: January 24, 2025  
**Status**: Production Ready
