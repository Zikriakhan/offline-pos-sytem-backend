# Quick Start Guide

## 🚀 Get Backend Running in 5 Minutes

### Prerequisites
- Node.js installed
- MongoDB installed (or MongoDB Atlas account)
- npm/yarn package manager

---

## Step 1: Setup Environment (1 min)

Create `.env` file in project root:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/digi-khata
JWT_SECRET=your_secret_key_here_change_in_production
CORS_ORIGIN=http://localhost:3000
```

---

## Step 2: Start MongoDB (30 sec)

```bash
# Windows
mongod

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

---

## Step 3: Install & Start Backend (1 min)

```bash
# Install dependencies
npm install

# Start server
npm start

# Or for development with auto-reload
npm run dev
```

You should see:
```
✓ Server running on http://localhost:5000
✓ Connected to MongoDB
```

---

## Step 4: Authenticate (30 sec)

Get JWT token by login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Copy the `token` from response.

---

## Step 5: Test API (2 min)

### Create an item:
```bash
TOKEN="your_token_here"

curl -X POST http://localhost:5000/api/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "sellingPrice": 999.99,
    "currentStock": 20,
    "reorderLevel": 5,
    "purchasePrice": 600
  }'
```

Save the `_id` from response.

### Create invoice:
```bash
ITEM_ID="id_from_above"

curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "itemId": "'$ITEM_ID'",
      "quantity": 2,
      "unitPrice": 999.99
    }],
    "paymentMethod": "cash",
    "tax": 100,
    "taxPercentage": 5
  }'
```

### Check metrics:
```bash
curl -X GET http://localhost:5000/api/sales-invoices/metrics/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

✅ **Done!** Backend is working!

---

## Using Postman (Easier)

1. Import `Digi-Khata-API.postman_collection.json`
2. Set variables:
   - `base_url`: http://localhost:5000
   - `token`: Your JWT token
3. Click "Send" on any request

---

## Key API Endpoints

```
CREATE ITEM:        POST   /api/inventory
LIST ITEMS:         GET    /api/inventory
CREATE INVOICE:     POST   /api/sales-invoices
LIST INVOICES:      GET    /api/sales-invoices
GET METRICS:        GET    /api/sales-invoices/metrics/dashboard
GET ITEM STATS:     GET    /api/sales-invoices/items/:id/stats
LOW STOCK ALERTS:   GET    /api/inventory/alerts/low-stock
```

---

## Troubleshooting

### MongoDB not connecting?
```bash
# Check if MongoDB is running
mongo --version

# Start MongoDB
mongod
```

### Port 5000 already in use?
```bash
# Kill process using port 5000
lsof -i :5000
kill -9 <PID>
```

### Token errors?
- Get new token from `/api/auth/login`
- Include in header: `Authorization: Bearer <token>`

### Database errors?
- Check MONGODB_URI in .env
- Verify MongoDB is running
- Check database name in URI

---

## Next Steps

1. ✅ Read [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for all endpoints
2. ✅ Follow [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) for examples
3. ✅ Connect your frontend to the API
4. ✅ Deploy to production (see [BACKEND_README.md](BACKEND_README.md))

---

## Common Workflows

### Full Sale Process
```
1. POST /api/inventory          → Create item
2. POST /api/customers          → Create customer
3. POST /api/sales-invoices     → Create invoice (stock auto-updates)
4. PUT  /api/sales-invoices/:id → Update with payment
```

### Stock Management
```
1. POST /api/inventory/:id/adjust-stock   → Adjust stock manually
2. GET  /api/inventory/alerts/low-stock   → Check low stock
3. GET  /api/inventory/analytics/stats    → View statistics
```

### Sales Analysis
```
1. GET /api/sales-invoices                           → List all invoices
2. GET /api/sales-invoices/items/stats/all           → Per-item stats
3. GET /api/sales-invoices/metrics/dashboard         → Overall metrics
```

---

## Environment Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| NODE_ENV | development | Environment mode |
| PORT | 5000 | Server port |
| MONGODB_URI | mongodb://localhost:27017/digi-khata | Database connection |
| JWT_SECRET | your_secret_key | Token signing |
| CORS_ORIGIN | http://localhost:3000 | Frontend URL |

---

## File Structure

```
src/
├── models/           → Database schemas
├── controllers/      → Business logic
├── routes/           → API endpoints
├── middleware/       → Auth, errors
├── app.js           → Express setup
└── server.js        → Entry point
```

---

## Commands Reference

```bash
npm start           # Start server
npm run dev         # Start with auto-reload
npm test            # Run tests
npm run lint        # Check code quality
```

---

## Quick Stats

- ✅ 8 Inventory endpoints
- ✅ 8 Sales endpoints  
- ✅ Auto-calculated invoices
- ✅ Real-time stock updates
- ✅ Comprehensive reporting
- ✅ Full authentication

---

## Documentation

| Document | Use For |
|----------|---------|
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | API reference |
| [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) | Technical details |
| [BACKEND_README.md](BACKEND_README.md) | Setup & deployment |
| [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) | Testing examples |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Overview |

---

**Status**: ✅ Ready to Use  
**Version**: 1.0.0  
**Date**: January 24, 2025
