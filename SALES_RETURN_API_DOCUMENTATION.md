# Sales Return API Documentation

## Overview
This document describes the complete Sales Return API implementation following the Entity-Relationship Diagram (ERD) and flowchart specifications.

## Database Models

### SalesReturn Model
Located at: `SERVER FILE/src/models/SalesReturn.js`

**Main Fields:**
- `returnNumber`: Unique identifier (auto-generated: RET-YYYYMM-XXXX)
- `originalSaleId`: Reference to original SalesInvoice
- `originalInvoiceNumber`: Original invoice number for easy reference
- `customer`: Reference to Customer (optional)
- `customerName`: Customer name (required)
- `returnDate`: Date of return transaction
- `returnItems`: Array of items being returned
- `subtotalReturn`: Sum of all return item totals
- `taxReturn`: Proportional tax to be refunded
- `totalReturnAmount`: Total refund amount
- `refundMethod`: Method of refund (cash, credit, original_payment, etc.)
- `refundStatus`: Status of refund (pending, approved, processed, completed, rejected)
- `status`: Transaction status (draft, submitted, approved, completed, cancelled)
- `inventoryUpdated`: Boolean flag indicating if inventory was updated
- `processedBy`: User who processed the return
- `approvedBy`: User who approved the return

**Return Item Schema:**
- `saleItemId`: Reference to original sale item
- `itemId`: Reference to InventoryItem
- `itemName`: Name of the item
- `quantityReturned`: Number of units being returned
- `unitPrice`: Price per unit
- `itemTotal`: Total refund for this item (quantityReturned * unitPrice)
- `returnReason`: Reason for return (defective, wrong_item, not_needed, damaged, expired, customer_request, other)
- `notes`: Additional notes about this item

## API Endpoints

### Base URL
`/api/sales-returns`

### Authentication
All endpoints require authentication via Bearer token in Authorization header.

---

### 1. Create Sales Return
**POST** `/api/sales-returns`

Creates a new sales return transaction.

**Request Body:**
```json
{
  "originalSaleId": "60d5ec49f1b2c3d4e5f6a7b8",
  "returnItems": [
    {
      "itemId": "60d5ec49f1b2c3d4e5f6a7b9",
      "quantityReturned": 2,
      "returnReason": "defective",
      "notes": "Product damaged during shipping"
    }
  ],
  "returnReason": "customer_request",
  "refundMethod": "original_payment",
  "notes": "Customer requested full refund"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sales return created successfully",
  "data": {
    "_id": "60d5ec49f1b2c3d4e5f6a7ba",
    "returnNumber": "RET-202601-0001",
    "originalSaleId": "60d5ec49f1b2c3d4e5f6a7b8",
    "originalInvoiceNumber": "INV-2024-001",
    "customerName": "John Doe",
    "returnItems": [...],
    "subtotalReturn": 200.00,
    "taxReturn": 20.00,
    "totalReturnAmount": 220.00,
    "refundStatus": "pending",
    "status": "submitted",
    "createdAt": "2026-01-29T10:00:00.000Z"
  }
}
```

**Validation Rules:**
- Original sale ID must exist and belong to the authenticated user
- Return items must exist in the original sale
- Return quantity cannot exceed (original quantity - already returned quantity)
- Inventory is automatically updated when return is approved

---

### 2. Get All Sales Returns
**GET** `/api/sales-returns`

Retrieves all sales returns with optional filters and pagination.

**Query Parameters:**
- `status` - Filter by status (submitted, approved, completed, cancelled)
- `refundStatus` - Filter by refund status (pending, approved, processed, completed, rejected)
- `startDate` - Filter by start date (ISO format)
- `endDate` - Filter by end date (ISO format)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Example:** `/api/sales-returns?status=submitted&page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "count": 20,
  "total": 45,
  "page": 1,
  "totalPages": 3,
  "data": [...]
}
```

---

### 3. Get Sales Return by ID
**GET** `/api/sales-returns/:id`

Retrieves a specific sales return with full details.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c3d4e5f6a7ba",
    "returnNumber": "RET-202601-0001",
    "originalSaleId": {...},
    "customer": {...},
    "returnItems": [...],
    "totalReturnAmount": 220.00,
    ...
  }
}
```

---

### 4. Approve Sales Return
**PUT** `/api/sales-returns/:id/approve`

Approves a sales return and optionally updates inventory.

**Request Body:**
```json
{
  "updateInventory": true
}
```

**What Happens:**
1. Return status changes to "approved"
2. Refund status changes to "approved"
3. If `updateInventory` is true:
   - Adds returned quantities back to inventory stock
   - Updates sales statistics (decreases total sold, decreases revenue)
   - Marks `inventoryUpdated` as true

**Response:**
```json
{
  "success": true,
  "message": "Sales return approved successfully",
  "data": {...}
}
```

---

### 5. Process Refund
**PUT** `/api/sales-returns/:id/process-refund`

Processes refund for an approved sales return.

**Request Body:**
```json
{
  "refundMethod": "cash",
  "notes": "Refund processed via cash on 2026-01-29"
}
```

**Requirements:**
- Return must be approved first
- Cannot process already processed refunds

**Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {...}
}
```

---

### 6. Update Sales Return
**PUT** `/api/sales-returns/:id`

Updates sales return details (limited fields).

**Allowed Updates:**
- `notes`
- `returnReason`
- `refundMethod`
- `status`

**Request Body:**
```json
{
  "notes": "Updated notes",
  "status": "cancelled"
}
```

**Restrictions:**
- Cannot update completed or cancelled returns

---

### 7. Cancel Sales Return
**DELETE** `/api/sales-returns/:id`

Cancels a sales return (soft delete).

**What Happens:**
1. If inventory was updated, reverts all inventory changes
2. Restores original sale quantities
3. Marks return as "cancelled"
4. Sets refund status to "rejected"

**Response:**
```json
{
  "success": true,
  "message": "Sales return cancelled successfully"
}
```

---

### 8. Get Statistics
**GET** `/api/sales-returns/stats`

Retrieves aggregated statistics about sales returns.

**Query Parameters:**
- `startDate` - Filter by start date
- `endDate` - Filter by end date

**Response:**
```json
{
  "success": true,
  "data": {
    "totalReturns": 45,
    "totalReturnAmount": 12500.00,
    "pendingReturns": 10,
    "approvedReturns": 15,
    "completedReturns": 18,
    "cancelledReturns": 2,
    "pendingRefunds": 3500.00,
    "processedRefunds": 9000.00
  }
}
```

---

## Frontend Integration

### Import API Functions
```javascript
import { 
  createSalesReturn, 
  getAllSalesReturns, 
  approveSalesReturn, 
  processRefund,
  validateReturnItems,
  calculateReturnTotals
} from './API/salesReturnsAPI';
```

### Example Usage

#### Create a Return
```javascript
const handleCreateReturn = async (originalSaleId, returnItems) => {
  try {
    const returnData = {
      originalSaleId,
      returnItems: returnItems.map(item => ({
        itemId: item.itemId,
        quantityReturned: item.quantity,
        returnReason: 'customer_request',
        notes: item.notes
      })),
      returnReason: 'customer_request',
      refundMethod: 'original_payment'
    };

    const response = await createSalesReturn(returnData);
    console.log('Return created:', response.data.returnNumber);
    alert(`Return created: ${response.data.returnNumber}`);
  } catch (error) {
    console.error('Error:', error);
    alert(error.message);
  }
};
```

#### Validate Before Submission
```javascript
const validation = validateReturnItems(originalSale, returnItems);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  alert(validation.errors.join('\n'));
  return;
}
```

#### Calculate Return Totals
```javascript
const totals = calculateReturnTotals(returnItems, originalSale);
console.log('Subtotal:', totals.subtotalReturn);
console.log('Tax:', totals.taxReturn);
console.log('Total:', totals.totalReturnAmount);
```

---

## Process Flow

### Return Item Flow
```
1. Customer Requests Return
   ↓
2. Verify Item Eligibility
   ↓
3. Create Return Transaction (POST /api/sales-returns)
   - System validates return items
   - System updates original invoice with returnedQuantity
   - System creates SalesReturn record
   ↓
4. Review and Approve (PUT /api/sales-returns/:id/approve)
   - Manager/Admin reviews
   - System updates inventory if approved
   ↓
5. Process Refund (PUT /api/sales-returns/:id/process-refund)
   - Process payment refund
   - Mark as completed
   ↓
6. Generate Return Receipt
   - Customer receives confirmation
```

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Return quantity (5) exceeds available quantity (3) for item Widget A"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Original sale invoice not found"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Failed to create sales return",
  "error": "Database connection error"
}
```

---

## Database Indexes

Optimized indexes for efficient querying:
- `{ owner: 1, returnDate: -1 }`
- `{ originalSaleId: 1 }`
- `{ customer: 1 }`
- `{ returnNumber: 1, owner: 1 }`
- `{ status: 1 }`
- `{ refundStatus: 1 }`

---

## Testing

### Test the API with curl

**Create a return:**
```bash
curl -X POST http://localhost:3000/api/sales-returns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalSaleId": "60d5ec49f1b2c3d4e5f6a7b8",
    "returnItems": [{
      "itemId": "60d5ec49f1b2c3d4e5f6a7b9",
      "quantityReturned": 1,
      "returnReason": "defective"
    }],
    "refundMethod": "cash"
  }'
```

**Get all returns:**
```bash
curl -X GET "http://localhost:3000/api/sales-returns?status=submitted" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Approve a return:**
```bash
curl -X PUT http://localhost:3000/api/sales-returns/60d5ec49f1b2c3d4e5f6a7ba/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"updateInventory": true}'
```

---

## Notes

1. **Inventory Management**: When a return is approved with `updateInventory: true`, the system automatically:
   - Adds returned quantity back to stock
   - Decreases total quantity sold
   - Decreases total revenue

2. **Original Sale Updates**: The original sale invoice is automatically updated with:
   - `returnedQuantity` for each item
   - Recalculated totals
   - Updated status if necessary

3. **Return Number Format**: Auto-generated as `RET-YYYYMM-XXXX` where:
   - YYYY = Year
   - MM = Month
   - XXXX = Sequential number (4 digits)

4. **Refund Status vs Transaction Status**:
   - `status`: Overall transaction state (submitted, approved, completed, cancelled)
   - `refundStatus`: Payment refund state (pending, approved, processed, completed, rejected)

---

## Support

For issues or questions:
1. Check error messages in console
2. Verify authentication token
3. Ensure original sale exists and belongs to user
4. Check return quantities don't exceed available quantities
