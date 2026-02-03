# Digi-Khata Backend API - Sales & Inventory Management System

A production-ready Node.js/Express.js backend API for managing sales transactions, inventory items, and customer data. Built with MongoDB and featuring comprehensive stock management, invoice generation, and real-time analytics.

## Features

### ✅ Inventory Management
- Create, read, update, delete inventory items
- Real-time stock tracking with automatic updates
- Reorder level alerts for low-stock items
- Unit of measure support (piece, kg, liter, etc.)
- Inventory statistics and analytics

### ✅ Sales & Invoice Management
- Complete invoice creation with automatic stock reduction
- Auto-generated invoice numbers (format: INV-YYYYMMDD-XXXX)
- Comprehensive invoice details:
  - Invoice date & time
  - Customer information (optional)
  - Payment method tracking
  - Item details (name, quantity, unit price, total)
  - Subtotal calculation
  - Discount support (amount or percentage)
  - Tax calculation (amount or percentage)
  - Grand total calculation
- Invoice status tracking (draft, pending, paid, cancelled)
- Payment tracking and outstanding balance management
- Invoice modification and deletion with stock reversal

### ✅ Sales History & Reporting
- Per-item sales statistics:
  - Total quantity sold
  - Number of sales transactions
  - Total revenue generated
  - Average revenue per transaction
- Dashboard metrics:
  - Total sales and revenue
  - Paid vs pending invoices
  - Discount and tax totals
  - Outstanding balance tracking
- Top-selling items report

### ✅ Customer Management
- Customer profile management
- Total purchases tracking
- Outstanding balance management
- Customer linking with invoices

### ✅ Stock Management
- Automatic stock updates on sale
- Manual stock adjustments with reason tracking
- Stock reversal on invoice deletion
- Low-stock alerts and warnings
- Sales metrics integration

### ✅ Security & Access Control
- JWT-based authentication
- User isolation (access to own data only)
- Admin role support
- Role-based authorization

---

## Technology Stack

- **Runtime**: Node.js (v14+)
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express input validation
- **Logging**: Morgan HTTP logger
- **CORS**: Cross-origin support

---

## Prerequisites

- Node.js 14.0 or higher
- MongoDB 4.0 or higher
- npm or yarn package manager

---

## Installation & Setup

### 1. Clone Repository

```bash
cd Digi-Khata
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/digi-khata
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/digi-khata?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRE=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### 4. Database Setup

#### Option A: Local MongoDB

```bash
# Start MongoDB service (Windows)
mongod

# Or on Mac
brew services start mongodb-community

# Or on Linux
sudo systemctl start mongod
```

#### Option B: MongoDB Atlas

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update MONGODB_URI in .env

### 5. Start Server

```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

Server will start on `http://localhost:5000`

---

## Project Structure

```
src/
├── app.js                      # Express app configuration
├── server.js                   # Server entry point
├── config/
│   └── db.js                   # MongoDB connection
├── models/
│   ├── User.js                 # User model
│   ├── Customer.js             # Customer model
│   ├── InventoryItem.js        # Inventory item model
│   ├── SalesInvoice.js         # Sales invoice model
│   ├── PurchaseOrder.js        # Purchase order model
│   ├── Supplier.js             # Supplier model
│   └── Expense.js              # Expense model
├── controllers/
│   ├── authController.js       # Authentication logic
│   ├── inventoryController.js  # Inventory operations
│   ├── salesController.js      # Sales operations
│   ├── customersController.js  # Customer operations
│   ├── suppliersController.js  # Supplier operations
│   ├── purchaseOrdersController.js
│   ├── expensesController.js
│   ├── dashboardController.js
│   └── showAllDataController.js
├── routes/
│   ├── authRoutes.js
│   ├── inventoryRoutes.js
│   ├── salesRoutes.js
│   ├── customersRoutes.js
│   ├── suppliersRoutes.js
│   ├── purchaseOrdersRoutes.js
│   ├── expensesRoutes.js
│   ├── dashboardRoutes.js
│   └── showAllDataRoutes.js
└── middleware/
    ├── auth.js                 # JWT authentication
    └── errorHandler.js         # Error handling
```

---

## API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Inventory Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory` | List all items |
| POST | `/inventory` | Create new item |
| GET | `/inventory/:id` | Get single item |
| PUT | `/inventory/:id` | Update item |
| DELETE | `/inventory/:id` | Delete item |
| POST | `/inventory/:id/adjust-stock` | Manual stock adjustment |
| GET | `/inventory/alerts/low-stock` | Get low-stock alerts |
| GET | `/inventory/analytics/stats` | Get inventory statistics |

### Sales Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sales-invoices` | Create sales invoice |
| GET | `/sales-invoices` | List invoices |
| GET | `/sales-invoices/:id` | Get single invoice |
| PUT | `/sales-invoices/:id` | Update invoice |
| DELETE | `/sales-invoices/:id` | Delete invoice |
| GET | `/sales-invoices/items/:itemId/stats` | Get item sales stats |
| GET | `/sales-invoices/items/stats/all` | Get all items sales stats |
| GET | `/sales-invoices/metrics/dashboard` | Get sales metrics |

### Customer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List customers |
| POST | `/customers` | Create customer |
| GET | `/customers/:id` | Get single customer |
| PUT | `/customers/:id` | Update customer |
| DELETE | `/customers/:id` | Delete customer |

---

## Usage Examples

### Example 1: Create an Inventory Item

```bash
curl -X POST http://localhost:5000/api/inventory \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
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
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "itemId": "ITEM_ID_HERE",
        "quantity": 2,
        "unitPrice": 900
      }
    ],
    "customer": "CUSTOMER_ID_HERE",
    "paymentMethod": "credit",
    "discount": 100,
    "tax": 150,
    "taxPercentage": 5,
    "notes": "Corporate order"
  }'
```

### Example 3: Get Sales Dashboard Metrics

```bash
curl -X GET http://localhost:5000/api/sales-invoices/metrics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Testing

### Using Postman

1. Import `Digi-Khata-API.postman_collection.json`
2. Set variables:
   - `base_url`: http://localhost:5000
   - `token`: Your JWT token
   - `item_id`: Valid item ID
   - `customer_id`: Valid customer ID
3. Run requests

### Using cURL

See examples above or check API_DOCUMENTATION.md

### Using JavaScript/Fetch

```javascript
const token = 'YOUR_JWT_TOKEN';

// Create inventory item
const response = await fetch('http://localhost:5000/api/inventory', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Product Name',
    sellingPrice: 100,
    currentStock: 50
  })
});

const item = await response.json();
console.log(item);
```

---

## Authentication

### Getting a JWT Token

1. Register user via `/api/auth/register`
2. Login via `/api/auth/login` to get token
3. Include token in Authorization header for all requests:
   ```
   Authorization: Bearer <token>
   ```

---

## Data Validation

### Inventory Item
- `name`: Required, string
- `sellingPrice`: Required, number >= 0
- `purchasePrice`: number >= 0
- `currentStock`: number >= 0
- `reorderLevel`: number >= 0
- `status`: 'active' or 'inactive'

### Sales Invoice
- At least 1 item required
- Each item must have valid `itemId`, `quantity` > 0, `unitPrice` >= 0
- Stock must be available for all items
- Customer (if provided) must exist

---

## Error Handling

### Common Error Responses

**400 - Bad Request**
```json
{
  "message": "Invalid request data"
}
```

**401 - Unauthorized**
```json
{
  "message": "Authorization required"
}
```

**404 - Not Found**
```json
{
  "message": "Resource not found"
}
```

**500 - Server Error**
```json
{
  "message": "Internal server error"
}
```

---

## Performance Optimization

### Pagination
- Always use pagination for list endpoints
- Default: 10 items per page, Max: 100
- Example: `GET /api/inventory?page=2&limit=20`

### Filtering
- Use specific filters for better performance
- Example: `GET /api/inventory?status=active&category=Electronics`

### Indexing
- Database indexes created for common queries
- Indexed fields: owner, status, invoiceDate, customer

---

## Security Best Practices

1. **Change JWT Secret**: Update JWT_SECRET in production
2. **Use HTTPS**: Always use HTTPS in production
3. **Validate Input**: All inputs are validated server-side
4. **Rate Limiting**: Implement rate limiting for production
5. **Environment Variables**: Never commit .env files
6. **Error Messages**: No sensitive data in error responses

---

## Database Backup & Recovery

### Backup MongoDB

```bash
mongodump --uri "mongodb://localhost:27017/digi-khata" --out ./backup
```

### Restore MongoDB

```bash
mongorestore --uri "mongodb://localhost:27017/digi-khata" ./backup
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process using port 5000
lsof -i :5000
kill -9 <PID>
```

### MongoDB Connection Failed
- Verify MongoDB is running
- Check connection string in .env
- Verify credentials (if using MongoDB Atlas)

### JWT Token Invalid
- Token may have expired (default 7 days)
- Get new token by logging in again
- Check token format in Authorization header

### Stock Not Updating
- Verify item exists and belongs to correct user
- Check stock is sufficient before sale
- Verify request body format

---

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for implementation details.

---

## Development

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Check Code Quality
```bash
npm run lint
```

---

## Deployment

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add MongoDB Atlas URL
heroku config:set MONGODB_URI=your_mongodb_url

# Deploy
git push heroku main
```

### Docker Deployment

```bash
# Build image
docker build -t digi-khata .

# Run container
docker run -p 5000:5000 --env-file .env digi-khata
```

---

## Monitoring & Logging

### Request Logging
- Enabled via Morgan middleware
- Shows method, status, response time

### Error Logging
- All errors logged to console
- Include timestamp and error details

---

## Future Enhancements

- [ ] Advanced analytics and reporting
- [ ] Multi-location support
- [ ] Batch operations
- [ ] API webhooks
- [ ] Third-party integrations
- [ ] Mobile app API
- [ ] Real-time notifications

---

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Create pull request

---

## License

This project is proprietary and confidential.

---

## Support

For issues, questions, or suggestions:
- Create an issue in the repository
- Contact development team
- Check documentation files

---

## Changelog

### Version 1.0.0 (January 24, 2025)
- ✅ Inventory management API
- ✅ Sales and invoice management
- ✅ Stock tracking and updates
- ✅ Sales reporting and analytics
- ✅ Customer management
- ✅ JWT authentication
- ✅ Comprehensive error handling

---

**Last Updated**: January 24, 2025  
**Status**: Production Ready  
**Maintainer**: Development Team
